'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@store/auth.store'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lib/supabase'
import {
  useSession,
  useSessionScores,
  useBulkUpsertScores,
  useCompleteSession,
  useCreateOrOpenSession,
} from '@hooks/useAssessments'
import { ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import type { AssessmentPlan } from '@/types/database'

const SCORE_COLORS = [
  'bg-slate-100 text-slate-600 border-slate-200',
  'bg-red-100 text-red-700 border-red-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-teal-100 text-teal-700 border-teal-200',
]
const ABSENT_COLOR = 'bg-slate-50 text-slate-400 border-slate-200'

export default function SessionScoringPage({ params }: { params: { planId: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useAuthStore()
  const sessionDate = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd')
  const existingSessionId = searchParams.get('sessionId') ?? null

  const [scores, setScores] = useState<Record<string, string>>({})
  const [bulkNote, setBulkNote] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(existingSessionId)
  const [sessionStarted, setSessionStarted] = useState(!!existingSessionId)
  const [saving, setSaving] = useState(false)

  // Fetch plan
  const { data: plan } = useQuery({
    queryKey: ['assessment-plan', params.planId],
    enabled: !!params.planId,
    queryFn: async () => {
      const { data, error } = await supabase.from('assessment_plans').select('*').eq('id', params.planId).single()
      if (error) throw error
      return data as AssessmentPlan
    },
  })

  // Fetch classroom IDs for teacher
  const { data: classroomIds = [] } = useQuery({
    queryKey: ['teacher', 'classroom-ids'],
    enabled: !!profile?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.rpc('get_my_classroom_ids')
      return ((data ?? []) as any[]).map((a: any) => a.classroom_id as string)
    },
  })

  // Fetch children in classroom
  const { data: children = [] } = useQuery({
    queryKey: ['classroom-children', plan?.classroom_id ?? ''],
    enabled: !!plan?.classroom_id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from('children').select('id, first_name, last_name').eq('classroom_id', plan!.classroom_id).order('first_name')
      return (data ?? []) as { id: string; first_name: string; last_name: string }[]
    },
  })

  const { data: existingSession } = useSession(params.planId, sessionDate)
  const { data: existingScores = [] } = useSessionScores(sessionId)
  const { mutateAsync: bulkUpsert } = useBulkUpsertScores()
  const { mutateAsync: completeSession, isPending: completePending } = useCompleteSession()
  const { mutateAsync: createOrOpen, isPending: openPending } = useCreateOrOpenSession()

  // Sync existing scores
  useEffect(() => {
    if (existingScores.length > 0 && Object.keys(scores).length === 0) {
      const map: Record<string, string> = {}
      existingScores.forEach((s) => { map[s.child_id] = s.score })
      setScores(map)
    }
  }, [existingScores])

  useEffect(() => {
    if (existingSession && !sessionId) {
      setSessionId(existingSession.id)
      setSessionStarted(true)
      setBulkNote(existingSession.bulk_note ?? '')
    }
  }, [existingSession])

  const scoreLabels: string[] = (plan?.score_labels as any) ?? []
  const isCompleted = existingSession?.status === 'completed'

  const absentSet = useMemo(() => new Set(Object.entries(scores).filter(([, v]) => v === 'Absent').map(([k]) => k)), [scores])
  const presentChildren = useMemo(() => children.filter((c) => !absentSet.has(c.id)), [children, absentSet])
  const absentChildren = useMemo(() => children.filter((c) => absentSet.has(c.id)), [children, absentSet])
  const scoredCount = useMemo(() => presentChildren.filter((c) => scores[c.id] && scores[c.id] !== 'Absent').length, [presentChildren, scores])
  const unscoredCount = presentChildren.length - scoredCount

  const handleStartSession = async () => {
    if (!plan || !profile?.id || !profile?.school_id) return
    const session = await createOrOpen({
      schoolId: profile.school_id, planId: plan.id, classroomId: plan.classroom_id,
      teacherId: profile.id, sessionDate,
    })
    setSessionId(session.id)
    setSessionStarted(true)
  }

  const handleBulkApply = (score: string) => {
    setScores((prev) => {
      const next = { ...prev }
      children.forEach((c) => { if (!absentSet.has(c.id)) next[c.id] = score })
      return next
    })
  }

  const handleSetScore = (childId: string, score: string) => setScores((prev) => ({ ...prev, [childId]: score }))
  const handleToggleAbsent = (childId: string) => {
    setScores((prev) => {
      const next = { ...prev }
      if (next[childId] === 'Absent') { delete next[childId] } else { next[childId] = 'Absent' }
      return next
    })
  }

  const handleSave = useCallback(async () => {
    if (!sessionId || !profile?.id || !profile?.school_id) return
    setSaving(true)
    try {
      const rows = children.map((c) => ({ childId: c.id, score: scores[c.id] ?? '', isAbsent: scores[c.id] === 'Absent' })).filter((r) => r.score)
      await bulkUpsert({ sessionId, schoolId: profile.school_id, scores: rows, assessedBy: profile.id })
    } finally {
      setSaving(false)
    }
  }, [sessionId, profile, children, scores, bulkUpsert])

  const handleComplete = async () => {
    if (unscoredCount > 0 || !sessionId || !plan || !profile?.id) return
    await handleSave()
    await completeSession({ sessionId, planId: plan.id, classroomId: plan.classroom_id, sessionDate, bulkNote })
    router.push('/teacher/assessments')
  }

  if (!plan) return <div className="text-center py-20 text-slate-400">Loading plan…</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
          <ChevronLeft size={16} /> Back to Assessments
        </button>
        <h1 className="text-xl font-bold text-slate-900">{plan.name}</h1>
        {plan.criteria && <p className="text-sm text-slate-500 mt-1">{plan.criteria}</p>}
        <p className="text-xs text-slate-400 mt-1">{format(new Date(sessionDate), 'EEEE, MMMM d yyyy')}</p>
      </div>

      {!sessionStarted ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-4xl mb-4">📊</p>
          <h2 className="text-lg font-bold text-slate-900 mb-2">{plan.name}</h2>
          <p className="text-sm text-slate-500 mb-6">{children.length} children in class. Ready to begin?</p>
          <button onClick={handleStartSession} disabled={openPending}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-8 py-3 rounded-xl text-sm disabled:opacity-50">
            {openPending ? 'Opening…' : 'Start Assessment →'}
          </button>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700">
                {scoredCount}/{children.length} scored · {absentChildren.length} absent · {unscoredCount} unscored
              </p>
              {isCompleted && <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle2 size={11} /> Completed</span>}
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-2 bg-teal-500 rounded-full transition-all" style={{ width: `${children.length === 0 ? 0 : (scoredCount / children.length) * 100}%` }} />
            </div>
          </div>

          {/* Bulk actions */}
          {!isCompleted && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bulk Apply:</span>
              {scoreLabels.map((label, i) => (
                <button key={label} onClick={() => handleBulkApply(label)}
                  className={`text-sm font-semibold px-4 py-1.5 rounded-full border ${SCORE_COLORS[Math.min(i, SCORE_COLORS.length - 1)] ?? SCORE_COLORS[0]} hover:opacity-80`}>
                  {label} → All
                </button>
              ))}
              <button onClick={() => {
                const unscored = children.filter((c) => !scores[c.id])
                if (unscored.length === 0) return
                setScores((prev) => {
                  const next = { ...prev }
                  unscored.forEach((c) => { next[c.id] = 'Absent' })
                  return next
                })
              }}
                className="text-sm font-semibold px-4 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:opacity-80">
                Mark Unscored Absent
              </button>
            </div>
          )}

          {/* Scoring table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Child</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Absent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {children.map((child) => {
                  const isAbsent = absentSet.has(child.id)
                  const score = scores[child.id] ?? ''
                  const scoreIdx = scoreLabels.indexOf(score)
                  return (
                    <tr key={child.id} className={isAbsent ? 'opacity-50 bg-slate-50' : ''}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 text-sm">{child.first_name} {child.last_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        {isAbsent ? (
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${ABSENT_COLOR}`}>Absent</span>
                        ) : isCompleted ? (
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${score ? (SCORE_COLORS[Math.min(scoreIdx, SCORE_COLORS.length - 1)] ?? SCORE_COLORS[0]) : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                            {score || 'Not scored'}
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {scoreLabels.map((label, i) => (
                              <button key={label} onClick={() => handleSetScore(child.id, label)}
                                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${score === label ? (SCORE_COLORS[Math.min(i, SCORE_COLORS.length - 1)] ?? SCORE_COLORS[0]) : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!isCompleted && (
                          <input type="checkbox" checked={isAbsent} onChange={() => handleToggleAbsent(child.id)}
                            className="rounded text-slate-400 cursor-pointer" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Session note */}
          {!isCompleted && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Session Note (optional)</label>
              <textarea
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                placeholder="Any notes about this session..."
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          )}

          {/* Actions */}
          {!isCompleted && (
            <div className="flex gap-3 justify-end">
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Progress'}
              </button>
              <button onClick={handleComplete} disabled={unscoredCount > 0 || completePending}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
                <CheckCircle2 size={16} />
                {unscoredCount > 0 ? `${unscoredCount} unscored remaining` : 'Complete Assessment'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
