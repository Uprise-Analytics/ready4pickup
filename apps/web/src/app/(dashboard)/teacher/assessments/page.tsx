'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@store/auth.store'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lib/supabase'
import {
  useTodaysDuePlans,
  useTodaysSessions,
  useMyAssessmentPlans,
  useMyPendingPlans,
  useClassroomObservations,
  useCreateOrOpenSession,
  useCreateObservation,
  useCreateAssessmentPlan,
  useAssessmentTemplates,
} from '@hooks/useAssessments'
import { BookOpen, Users, PenLine, CheckCircle2, Clock, Plus } from 'lucide-react'
import type { AssessmentPlan, AssessmentSessionWithPlan, DevelopmentArea, AssessmentFrequency } from '@/types/database'

const todayStr = () => format(new Date(), 'yyyy-MM-dd')

const AREA_OPTIONS: { value: DevelopmentArea; label: string }[] = [
  { value: 'cognitive', label: 'Cognitive' }, { value: 'language', label: 'Language' },
  { value: 'fine_motor', label: 'Fine Motor' }, { value: 'gross_motor', label: 'Gross Motor' },
  { value: 'social_emotional', label: 'Social & Emotional' }, { value: 'creative', label: 'Creative' },
  { value: 'self_care', label: 'Self-Care' }, { value: 'mathematics', label: 'Mathematics' },
  { value: 'literacy', label: 'Literacy' },
]

function statusBadge(session?: AssessmentSessionWithPlan) {
  if (!session) return <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Not Started</span>
  if (session.status === 'completed') return <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 size={10} /> Completed</span>
  return <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock size={10} /> In Progress</span>
}

function PlanRow({ plan, session, onStart }: { plan: AssessmentPlan; session?: AssessmentSessionWithPlan; onStart: () => void }) {
  return (
    <div className={`bg-white border rounded-xl px-5 py-4 flex items-center gap-4 ${session?.status === 'completed' ? 'border-green-200' : 'border-slate-200'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-800 truncate">{plan.name}</p>
          {plan.development_area && (
            <span className="text-xs font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full capitalize">
              {plan.development_area.replace('_', ' ')}
            </span>
          )}
        </div>
        {plan.criteria && <p className="text-sm text-slate-500 mt-0.5 truncate">{plan.criteria}</p>}
        <p className="text-xs text-slate-400 mt-1 capitalize">{plan.frequency}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {statusBadge(session)}
        <button onClick={onStart} className="text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline whitespace-nowrap">
          {session ? (session.status === 'completed' ? 'View →' : 'Continue →') : 'Start →'}
        </button>
      </div>
    </div>
  )
}

function ObservationModal({
  mode, classroomIds, schoolId, observedBy, onClose,
}: { mode: 'single' | 'group'; classroomIds: string[]; schoolId: string; observedBy: string; onClose: () => void }) {
  const [note, setNote] = useState('')
  const [area, setArea] = useState<DevelopmentArea | ''>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { mutateAsync: createObs, isPending } = useCreateObservation()

  const { data: children = [] } = useQuery({
    queryKey: ['classroom-children', classroomIds.join(',')],
    enabled: classroomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('children').select('id, first_name, last_name').in('classroom_id', classroomIds).order('first_name')
      return (data ?? []) as { id: string; first_name: string; last_name: string }[]
    },
  })

  const toggle = (id: string) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleSave = async () => {
    if (!note.trim() || selectedIds.size === 0) return
    await createObs({
      schoolId,
      observedBy,
      childIds: Array.from(selectedIds),
      observation: note.trim(),
      developmentArea: area || undefined,
      classroomId: classroomIds[0],
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          {mode === 'group' ? '👥 Group Observation' : '✏️ Observation'}
        </h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you observe?"
          rows={4}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <div className="flex flex-wrap gap-2 mb-4">
          {AREA_OPTIONS.map(({ value, label }) => (
            <button key={value} onClick={() => setArea(area === value ? '' : value)}
              className={`text-xs px-3 py-1 rounded-full border font-medium ${area === value ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Children</p>
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 mb-4 max-h-48 overflow-y-auto">
          {children.map((c) => (
            <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggle(c.id)} className="rounded text-teal-600" />
              <span className="text-sm text-slate-800">{c.first_name} {c.last_name}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={isPending || !note.trim() || selectedIds.size === 0}
            className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm">
            {isPending ? 'Saving…' : 'Save Observation'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

const FREQ_OPTIONS: { value: AssessmentFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'once', label: 'Once' },
]

function CreatePlanModal({
  classroomId, schoolId, createdBy, onClose,
}: { classroomId: string; schoolId: string; createdBy: string; onClose: () => void }) {
  const [templateId, setTemplateId] = useState('')
  const [frequency, setFrequency] = useState<AssessmentFrequency>('weekly')
  const [startDate, setStartDate] = useState(todayStr())
  const { data: templates = [] } = useAssessmentTemplates(schoolId)
  const { mutateAsync: createPlan, isPending } = useCreateAssessmentPlan()

  const activeTemplates = templates.filter((t) => t.is_active !== false)

  const handleSubmit = async () => {
    const template = activeTemplates.find((t) => t.id === templateId)
    if (!template) return
    await createPlan({
      schoolId,
      classroomId,
      templateId: template.id,
      name: template.name,
      activity: template.activity ?? undefined,
      developmentArea: template.development_area ?? undefined,
      learningOutcome: template.learning_outcome ?? undefined,
      criteria: template.criteria ?? undefined,
      scoringMethod: template.scoring_method,
      scoreLabels: template.score_labels,
      defaultScore: template.default_score,
      frequency,
      scheduledDate: startDate,
      createdBy,
      submittedByTeacher: true,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Submit Assessment Plan</h2>
        <p className="text-xs text-slate-400 mb-5">Your plan will be sent to the admin for approval before it becomes active.</p>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Template</p>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 mb-4 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="">Select a template…</option>
          {activeTemplates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}{t.development_area ? ` · ${t.development_area.replace('_', ' ')}` : ''}</option>
          ))}
        </select>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Frequency</p>
        <div className="flex gap-2 mb-4">
          {FREQ_OPTIONS.map((f) => (
            <button key={f.value} onClick={() => setFrequency(f.value)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${frequency === f.value ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
              {f.label}
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Start Date</p>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 mb-6 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={isPending || !templateId}
            className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm">
            {isPending ? 'Submitting…' : 'Submit for Approval'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function TeacherAssessmentsPage() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const schoolId = profile?.school_id ?? null
  const [tab, setTab] = useState<'today' | 'all'>('today')
  const [obsModal, setObsModal] = useState<'single' | 'group' | null>(null)
  const [createModal, setCreateModal] = useState(false)

  const { data: classroomIds = [] } = useQuery({
    queryKey: ['teacher', 'classroom-ids'],
    enabled: !!profile?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.rpc('get_my_classroom_ids')
      return ((data ?? []) as any[]).map((a: any) => a.classroom_id as string)
    },
  })

  const { data: duePlans = [], isLoading: duePlansLoading } = useTodaysDuePlans(classroomIds)
  const { data: todaysSessions = [], isLoading: sessionsLoading } = useTodaysSessions(classroomIds)
  const { data: allPlans = [], isLoading: allPlansLoading } = useMyAssessmentPlans(classroomIds)
  const { data: pendingPlans = [] } = useMyPendingPlans(classroomIds)
  const { data: observations = [] } = useClassroomObservations(classroomIds[0] ?? null)
  const { mutateAsync: createOrOpen } = useCreateOrOpenSession()

  const sessionByPlanId = useMemo(() => {
    const map = new Map<string, AssessmentSessionWithPlan>()
    todaysSessions.forEach((s) => map.set(s.plan_id, s))
    return map
  }, [todaysSessions])

  const completedToday = todaysSessions.filter((s) => s.status === 'completed').length
  const todayObs = useMemo(() => {
    const d = format(new Date(), 'yyyy-MM-dd')
    return observations.filter((o: any) => o.observed_at?.startsWith(d))
  }, [observations])

  const handleStart = async (plan: AssessmentPlan) => {
    if (!profile?.id || !profile?.school_id) return
    const session = await createOrOpen({
      schoolId: profile.school_id,
      planId: plan.id,
      classroomId: plan.classroom_id,
      teacherId: profile.id,
      sessionDate: todayStr(),
    })
    router.push(`/teacher/assessments/${plan.id}/session?sessionId=${session.id}&date=${todayStr()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen size={24} className="text-teal-600" />
            Assessments
          </h1>
          <p className="text-sm text-slate-500 mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 font-semibold rounded-lg text-sm border border-violet-200">
            <Plus size={15} /> Submit Plan
          </button>
          <button onClick={() => setObsModal('single')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-sm border border-blue-200">
            <PenLine size={15} /> Observation
          </button>
          <button onClick={() => setObsModal('group')}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold rounded-lg text-sm border border-teal-200">
            <Users size={15} /> Group Obs.
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-900">{duePlans.length}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Due Today</p>
        </div>
        <div className="bg-white border border-green-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-700">{completedToday}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Completed</p>
        </div>
        <div className="bg-white border border-blue-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-700">{todayObs.length}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Observations</p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['today', 'all'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'today' ? `Due Today (${duePlans.length})` : `All Plans (${allPlans.length})`}
          </button>
        ))}
      </div>

      {(duePlansLoading || sessionsLoading) ? (
        <div className="text-center py-12 text-slate-400">Loading assessments…</div>
      ) : tab === 'today' ? (
        <div className="space-y-3">
          {duePlans.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 size={44} className="text-green-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600 text-lg">All done for today!</p>
              <p className="text-sm text-slate-400 mt-1">No assessments due, or all are complete.</p>
            </div>
          ) : (
            duePlans.map((plan) => (
              <PlanRow key={plan.id} plan={plan} session={sessionByPlanId.get(plan.id)} onStart={() => handleStart(plan)} />
            ))
          )}
          {todayObs.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Today's Observations</p>
              <div className="space-y-2">
                {(todayObs as any[]).slice(0, 5).map((obs) => (
                  <div key={obs.id} className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      {obs.is_group && <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">👥 Group</span>}
                      {obs.development_area && <span className="text-xs text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full capitalize">{obs.development_area.replace('_', ' ')}</span>}
                      <span className="text-xs text-slate-400 ml-auto">{format(new Date(obs.observed_at), 'h:mm a')}</span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">{obs.observation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pendingPlans.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Pending Admin Approval ({pendingPlans.length})</p>
              {pendingPlans.map((plan) => (
                <div key={plan.id} className={`rounded-xl px-5 py-4 border mb-2 ${plan.approval_status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{plan.name}</p>
                    {plan.development_area && (
                      <span className="text-xs font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full capitalize">{plan.development_area.replace('_', ' ')}</span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-auto ${plan.approval_status === 'rejected' ? 'text-red-700 bg-red-100' : 'text-amber-700 bg-amber-100'}`}>
                      {plan.approval_status === 'rejected' ? 'Not Approved' : 'Awaiting Approval'}
                    </span>
                  </div>
                  {plan.approval_status === 'rejected' && plan.rejection_reason && (
                    <p className="text-xs text-red-600 mt-2">Reason: {plan.rejection_reason}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1 capitalize">{plan.frequency}</p>
                </div>
              ))}
            </div>
          )}
          {allPlansLoading ? (
            <div className="text-center py-12 text-slate-400">Loading…</div>
          ) : allPlans.length === 0 && pendingPlans.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen size={44} className="text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600 text-lg">No assessment plans</p>
              <p className="text-sm text-slate-400 mt-1">Submit a plan for admin approval, or ask your admin to apply an assessment pack.</p>
            </div>
          ) : (
            allPlans.map((plan) => (
              <PlanRow key={plan.id} plan={plan} session={sessionByPlanId.get(plan.id)} onStart={() => handleStart(plan)} />
            ))
          )}
        </div>
      )}

      {obsModal && (
        <ObservationModal
          mode={obsModal}
          classroomIds={classroomIds}
          schoolId={schoolId ?? ''}
          observedBy={profile?.id ?? ''}
          onClose={() => setObsModal(null)}
        />
      )}
      {createModal && classroomIds[0] && schoolId && profile?.id && (
        <CreatePlanModal
          classroomId={classroomIds[0]}
          schoolId={schoolId}
          createdBy={profile.id}
          onClose={() => setCreateModal(false)}
        />
      )}
    </div>
  )
}
