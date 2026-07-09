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
  useMyPlanSubmissions,
  useClassroomObservations,
  useCreateOrOpenSession,
  useCreateObservation,
  useSubmitAssessmentPlan,
  useAssessmentTemplates,
} from '@hooks/useAssessments'
import { BookOpen, Users, PenLine, CheckCircle2, Clock, Plus, X, ChevronDown } from 'lucide-react'
import type { AssessmentPlan, AssessmentSessionWithPlan, DevelopmentArea, AssessmentFrequency, AgeGroup } from '@/types/database'

const todayStr = () => format(new Date(), 'yyyy-MM-dd')

const AREA_OPTIONS: { value: DevelopmentArea; label: string }[] = [
  { value: 'cognitive', label: 'Cognitive' }, { value: 'language', label: 'Language' },
  { value: 'fine_motor', label: 'Fine Motor' }, { value: 'gross_motor', label: 'Gross Motor' },
  { value: 'social_emotional', label: 'Social & Emotional' }, { value: 'creative', label: 'Creative' },
  { value: 'self_care', label: 'Self-Care' }, { value: 'mathematics', label: 'Mathematics' },
  { value: 'literacy', label: 'Literacy' },
]

const FREQ_OPTIONS: { value: AssessmentFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'once', label: 'Once' },
]

const TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3', 'Term 4']
const AGE_FILTERS: { value: AgeGroup | 'all'; label: string }[] = [
  { value: 'all', label: 'All Ages' },
  { value: '2-3', label: '2–3 yrs' },
  { value: '3-4', label: '3–4 yrs' },
  { value: '4-5', label: '4–5 yrs' },
]

interface PlanItem {
  id: string
  mode: 'template' | 'custom'
  templateId: string
  customName: string
  customCriteria: string
  customArea: string
  frequency: AssessmentFrequency
  scheduledDate: string
}

function newItem(): PlanItem {
  return {
    id: crypto.randomUUID(),
    mode: 'template',
    templateId: '',
    customName: '',
    customCriteria: '',
    customArea: '',
    frequency: 'weekly',
    scheduledDate: todayStr(),
  }
}

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
      schoolId, observedBy,
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
          value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="What did you observe?" rows={4}
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

function ItemEditor({
  item, templates, ageFilter, onChange, onRemove,
}: {
  item: PlanItem
  templates: any[]
  ageFilter: AgeGroup | 'all'
  onChange: (updated: PlanItem) => void
  onRemove: () => void
}) {
  const filtered = templates.filter((t) =>
    ageFilter === 'all' || t.age_group === ageFilter || t.age_group === 'all'
  )

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
      <div className="flex items-center justify-between">
        {/* mode toggle */}
        <div className="flex gap-1 p-0.5 bg-white border border-slate-200 rounded-lg">
          {(['template', 'custom'] as const).map((m) => (
            <button key={m} onClick={() => onChange({ ...item, mode: m, templateId: '', customName: '' })}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${item.mode === m ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              {m === 'template' ? '📚 Template' : '✏️ Custom'}
            </button>
          ))}
        </div>
        <button onClick={onRemove} className="text-slate-400 hover:text-red-500 transition-colors">
          <X size={16} />
        </button>
      </div>

      {item.mode === 'template' ? (
        <select
          value={item.templateId}
          onChange={(e) => onChange({ ...item, templateId: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="">Select a template…</option>
          {filtered.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}{t.development_area ? ` · ${t.development_area.replace('_', ' ')}` : ''}
            </option>
          ))}
        </select>
      ) : (
        <div className="space-y-2">
          <input
            value={item.customName}
            onChange={(e) => onChange({ ...item, customName: e.target.value })}
            placeholder="What to assess (e.g. Counts to 10) *"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          <textarea
            value={item.customCriteria}
            onChange={(e) => onChange({ ...item, customCriteria: e.target.value })}
            placeholder="Observable criteria (optional)"
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
          <div className="flex flex-wrap gap-1.5">
            {AREA_OPTIONS.map((a) => (
              <button key={a.value} onClick={() => onChange({ ...item, customArea: item.customArea === a.value ? '' : a.value })}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${item.customArea === a.value ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 items-center pt-1">
        <span className="text-xs text-slate-500 font-medium">Frequency:</span>
        {FREQ_OPTIONS.map((f) => (
          <button key={f.value} onClick={() => onChange({ ...item, frequency: f.value })}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${item.frequency === f.value ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
            {f.label}
          </button>
        ))}
        <input
          type="date" value={item.scheduledDate}
          onChange={(e) => onChange({ ...item, scheduledDate: e.target.value })}
          className="ml-auto border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
      </div>
    </div>
  )
}

function SubmitPlanModal({
  classroomIds, schoolId, submittedBy, onClose,
}: { classroomIds: string[]; schoolId: string; submittedBy: string; onClose: () => void }) {
  const [planName, setPlanName] = useState('')
  const [term, setTerm] = useState('')
  const [selectedClassroomId, setSelectedClassroomId] = useState(classroomIds[0] ?? '')
  const [ageFilter, setAgeFilter] = useState<AgeGroup | 'all'>('all')
  const [items, setItems] = useState<PlanItem[]>([newItem()])

  const { data: templates = [] } = useAssessmentTemplates(schoolId)
  const { data: classrooms = [] } = useQuery({
    queryKey: ['classrooms-for-teacher', classroomIds.join(',')],
    enabled: classroomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from('classrooms').select('id, name').in('id', classroomIds)
      return (data ?? []) as { id: string; name: string }[]
    },
  })
  const { mutateAsync: submitPlan, isPending } = useSubmitAssessmentPlan()

  const activeTemplates = templates.filter((t) => t.is_active !== false)

  const updateItem = (id: string, updated: PlanItem) =>
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)))
  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((it) => it.id !== id))
  const addItem = () => setItems((prev) => [...prev, newItem()])

  const isValid = planName.trim().length > 0 && items.length > 0 && items.every((it) =>
    it.mode === 'template' ? !!it.templateId : !!it.customName.trim()
  )

  const handleSubmit = async () => {
    if (!isValid) return
    const mappedItems = items.map((it) => {
      if (it.mode === 'template') {
        const t = activeTemplates.find((x) => x.id === it.templateId)!
        return {
          templateId: t.id,
          name: t.name,
          activity: t.activity ?? undefined,
          developmentArea: (t.development_area ?? undefined) as DevelopmentArea | undefined,
          criteria: t.criteria ?? undefined,
          frequency: it.frequency,
          scheduledDate: it.scheduledDate,
        }
      } else {
        return {
          name: it.customName.trim(),
          criteria: it.customCriteria.trim() || undefined,
          developmentArea: (it.customArea || undefined) as DevelopmentArea | undefined,
          frequency: it.frequency,
          scheduledDate: it.scheduledDate,
        }
      }
    })
    await submitPlan({
      schoolId, classroomId: selectedClassroomId, submittedBy,
      name: planName.trim(), term: term || null, items: mappedItems,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Submit Assessment Plan</h2>
          <p className="text-xs text-slate-400 mt-0.5">Your plan will be sent to the admin for approval before it becomes active.</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Plan meta */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Plan Name <span className="text-red-400">*</span></label>
            <input
              value={planName} onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. Term 2 Cognitive Development Plan"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Term</label>
              <select value={term} onChange={(e) => setTerm(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
                <option value="">No term</option>
                {TERM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {classrooms.length > 1 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Classroom</label>
                <select value={selectedClassroomId} onChange={(e) => setSelectedClassroomId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
                  {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Age group filter */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Filter templates by age group</label>
            <div className="flex gap-2">
              {AGE_FILTERS.map((f) => (
                <button key={f.value} onClick={() => setAgeFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${ageFilter === f.value ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assessment Items <span className="text-red-400">*</span></label>
              <span className="text-xs text-slate-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <ItemEditor
                  key={item.id} item={item} templates={activeTemplates} ageFilter={ageFilter}
                  onChange={(updated) => updateItem(item.id, updated)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
              <button onClick={addItem}
                className="w-full py-2 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 font-semibold hover:border-violet-400 hover:text-violet-600 transition-colors flex items-center justify-center gap-2">
                <Plus size={15} /> Add Item
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={handleSubmit} disabled={isPending || !isValid}
            className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm">
            {isPending ? 'Submitting…' : `Submit for Approval (${items.length} item${items.length !== 1 ? 's' : ''})`}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
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
  const [submitModal, setSubmitModal] = useState(false)

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
  const { data: mySubmissions = [] } = useMyPlanSubmissions(profile?.id ?? null)
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

  const pendingSubmissions = mySubmissions.filter((s) => s.approval_status === 'pending_approval')
  const rejectedSubmissions = mySubmissions.filter((s) => s.approval_status === 'rejected')

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
          <button onClick={() => setSubmitModal(true)}
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
          {/* Pending and rejected submissions */}
          {(pendingSubmissions.length > 0 || rejectedSubmissions.length > 0) && (
            <div className="mb-2 space-y-2">
              {pendingSubmissions.length > 0 && (
                <>
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Awaiting Approval ({pendingSubmissions.length})</p>
                  {pendingSubmissions.map((sub) => (
                    <div key={sub.id} className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800">{sub.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {sub.term && <span>{sub.term} · </span>}
                            {(sub as any).items?.length ?? 0} assessment item{((sub as any).items?.length ?? 0) !== 1 ? 's' : ''}
                            {(sub as any).classroom?.name && <span> · {(sub as any).classroom.name}</span>}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">Awaiting Approval</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {rejectedSubmissions.length > 0 && (
                <>
                  <p className="text-xs font-bold text-red-600 uppercase tracking-wider mt-3">Needs Revision ({rejectedSubmissions.length})</p>
                  {rejectedSubmissions.map((sub) => (
                    <div key={sub.id} className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800">{sub.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {sub.term && <span>{sub.term} · </span>}
                            {(sub as any).items?.length ?? 0} item{((sub as any).items?.length ?? 0) !== 1 ? 's' : ''}
                          </p>
                          {sub.rejection_reason && (
                            <p className="text-xs text-red-600 mt-1.5 font-medium">Admin note: {sub.rejection_reason}</p>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full shrink-0">Not Approved</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {allPlansLoading ? (
            <div className="text-center py-12 text-slate-400">Loading…</div>
          ) : allPlans.length === 0 && mySubmissions.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen size={44} className="text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600 text-lg">No assessment plans yet</p>
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
      {submitModal && classroomIds.length > 0 && schoolId && profile?.id && (
        <SubmitPlanModal
          classroomIds={classroomIds}
          schoolId={schoolId}
          submittedBy={profile.id}
          onClose={() => setSubmitModal(false)}
        />
      )}
    </div>
  )
}
