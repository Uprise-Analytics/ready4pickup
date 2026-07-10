'use client'

import { useState, useMemo, useEffect } from 'react'
import { format, subMonths } from 'date-fns'
import { useAuthStore } from '@store/auth.store'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lib/supabase'
import { useChildReportCards, useSaveReportCard } from '@hooks/useAssessments'
import { FileText, CheckCircle2, Save } from 'lucide-react'
import { toast } from 'sonner'

const YEAR = new Date().getFullYear()
const TERMS = [
  { label: 'Term 1', from: `${YEAR}-01-15`, to: `${YEAR}-04-30`, period: `Term 1 · ${YEAR}` },
  { label: 'Term 2', from: `${YEAR}-05-01`, to: `${YEAR}-08-31`, period: `Term 2 · ${YEAR}` },
  { label: 'Term 3', from: `${YEAR}-09-01`, to: `${YEAR}-12-05`, period: `Term 3 · ${YEAR}` },
]

const GRADE_OPTIONS = ['Outstanding', 'Good', 'Satisfactory', 'Needs Support']
const GRADE_COLORS: Record<string, string> = {
  Outstanding: 'bg-green-100 text-green-700 border-green-300',
  Good: 'bg-teal-100 text-teal-700 border-teal-300',
  Satisfactory: 'bg-amber-100 text-amber-700 border-amber-300',
  'Needs Support': 'bg-red-100 text-red-700 border-red-300',
}
const AREA_LABELS: Record<string, string> = {
  cognitive: 'Cognitive', language: 'Language', fine_motor: 'Fine Motor',
  gross_motor: 'Gross Motor', social_emotional: 'Social & Emotional',
  creative: 'Creative Arts', self_care: 'Self-Care', mathematics: 'Mathematics',
  literacy: 'Literacy',
}

type Child = { id: string; first_name: string; last_name: string }
type ScoreEntry = { score: string; is_absent: boolean; plan: { development_area: string | null; score_labels: string[] } | null }

function suggestedGrade(scores: ScoreEntry[], area: string): string | null {
  const valid = scores.filter((s) => !s.is_absent && s.score !== 'Absent' && s.plan?.development_area === area && s.plan)
  if (valid.length === 0) return null
  const avg = valid.reduce((sum, s) => {
    const labels = s.plan!.score_labels as string[]
    return sum + labels.indexOf(s.score) / (labels.length - 1)
  }, 0) / valid.length
  if (avg >= 0.85) return 'Outstanding'
  if (avg >= 0.65) return 'Good'
  if (avg >= 0.35) return 'Satisfactory'
  return 'Needs Support'
}

export default function TeacherReportCardsPage() {
  const { profile } = useAuthStore()
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0])
  const [grades, setGrades] = useState<Record<string, string>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [overallComment, setOverallComment] = useState('')

  const { data: classroomIds = [] } = useQuery({
    queryKey: ['teacher', 'classroom-ids'],
    enabled: !!profile?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.rpc('get_my_classroom_ids')
      return ((data ?? []) as any[]).map((a: any) => a.classroom_id as string)
    },
  })

  const { data: children = [], isLoading } = useQuery({
    queryKey: ['classroom-children', classroomIds.join(',')],
    enabled: classroomIds.length > 0,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('children').select('id, first_name, last_name').in('classroom_id', classroomIds).order('first_name')
      return (data ?? []) as Child[]
    },
  })

  const { data: scores = [] } = useQuery({
    queryKey: ['child-scores', selectedChild?.id ?? '', selectedTerm.from, selectedTerm.to],
    enabled: !!selectedChild,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('assessment_scores')
        .select('score, is_absent, session:assessment_sessions!inner(session_date, plan:assessment_plans(development_area, score_labels))')
        .eq('child_id', selectedChild!.id)
        .gte('session.session_date', selectedTerm.from)
        .lte('session.session_date', selectedTerm.to)
      return (data ?? []).map((d: any) => ({
        score: d.score,
        is_absent: d.is_absent,
        plan: d.session?.plan ?? null,
      })) as ScoreEntry[]
    },
  })

  const { data: savedCards = [] } = useChildReportCards(selectedChild?.id ?? null)
  const { mutateAsync: saveCard, isPending: isSaving } = useSaveReportCard()

  const savedCard = useMemo(
    () => savedCards.find((c) => c.period === selectedTerm.period),
    [savedCards, selectedTerm.period]
  )

  // Load saved card data when child/term changes
  useEffect(() => {
    if (savedCard) {
      const g: Record<string, string> = {}
      const c: Record<string, string> = {}
      savedCard.subjects.forEach((s) => { g[s.name] = s.grade; if (s.comment) c[s.name] = s.comment })
      setGrades(g)
      setComments(c)
      setOverallComment(savedCard.overall_comment ?? '')
    } else {
      setGrades({})
      setComments({})
      setOverallComment('')
    }
  }, [savedCard])

  // Pre-fill grades from assessment suggestions when no saved card
  useEffect(() => {
    if (!savedCard && scores.length > 0) {
      const suggested: Record<string, string> = {}
      Object.keys(AREA_LABELS).forEach((area) => {
        const s = suggestedGrade(scores, area)
        if (s) suggested[area] = s
      })
      setGrades((prev) => ({ ...suggested, ...prev }))
    }
  }, [scores, savedCard])

  const handleSelectChild = (child: Child) => {
    setSelectedChild(child)
    setGrades({})
    setComments({})
    setOverallComment('')
  }

  const buildSubjects = () =>
    Object.entries(AREA_LABELS)
      .filter(([area]) => grades[area])
      .map(([area, name]) => ({ name, grade: grades[area], comment: comments[area] || null }))

  const handleSave = async (publish: boolean) => {
    if (!selectedChild || !profile) return
    const subjects = buildSubjects()
    if (subjects.length === 0) { toast.error('Add at least one grade before saving'); return }
    await saveCard({
      childId: selectedChild.id,
      schoolId: profile.school_id!,
      createdBy: profile.id,
      period: selectedTerm.period,
      subjects,
      overallComment: overallComment.trim() || null,
      publish,
    })
    toast.success(publish
      ? `Report card published — parent will be notified`
      : 'Draft saved')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText size={24} className="text-teal-600" />
          Report Cards
        </h1>
        <p className="text-sm text-slate-500 mt-1">Select a child and term, grade each development area, then publish to the parent.</p>
      </div>

      {/* Term selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {TERMS.map((t) => (
          <button key={t.label}
            onClick={() => setSelectedTerm(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${selectedTerm.label === t.label ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Child list */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{children.length} Children</p>
          {isLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
          ) : children.map((child) => {
            const initials = `${child.first_name[0]}${child.last_name[0]}`.toUpperCase()
            const isSelected = selectedChild?.id === child.id
            const hasSaved = savedCards.some((c) => c.period === selectedTerm.period && c.child_id === child.id)
            const isPublished = savedCards.some((c) => c.period === selectedTerm.period && c.child_id === child.id && c.is_published)
            return (
              <button key={child.id} onClick={() => handleSelectChild(child)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${isSelected ? 'bg-teal-50 border-teal-400' : 'bg-white border-slate-200 hover:border-teal-300'}`}>
                <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-teal-700 font-bold text-sm">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{child.first_name} {child.last_name}</p>
                  <p className="text-xs text-slate-400">
                    {isPublished ? '✅ Published' : hasSaved ? '💾 Draft saved' : 'No card yet'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Grading panel */}
        <div className="lg:col-span-2">
          {!selectedChild ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center h-64">
              <p className="text-slate-400 text-sm">Select a child to start the report card</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{selectedChild.first_name} {selectedChild.last_name}</p>
                  <p className="text-xs text-slate-500">{selectedTerm.period}</p>
                </div>
                {savedCard?.is_published && (
                  <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12} /> Published {savedCard.published_at ? format(new Date(savedCard.published_at), 'MMM d') : ''}
                  </span>
                )}
              </div>

              {/* Development areas */}
              <div className="divide-y divide-slate-50">
                {Object.entries(AREA_LABELS).map(([area, label]) => {
                  const suggested = suggestedGrade(scores, area)
                  const current = grades[area] ?? ''
                  return (
                    <div key={area} className="px-6 py-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 mb-1">{label}</p>
                          {suggested && (
                            <p className="text-xs text-slate-400 mb-2">
                              Assessment suggests: <span className="font-semibold text-slate-600">{suggested}</span>
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {GRADE_OPTIONS.map((g) => (
                              <button key={g}
                                onClick={() => setGrades((prev) => ({ ...prev, [area]: g }))}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${current === g ? GRADE_COLORS[g] : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                                {g}
                              </button>
                            ))}
                            {current && (
                              <button onClick={() => setGrades((prev) => { const n = { ...prev }; delete n[area]; return n })}
                                className="px-2 py-1 text-xs text-slate-400 hover:text-red-500">✕</button>
                            )}
                          </div>
                        </div>
                        {current && (
                          <input
                            value={comments[area] ?? ''}
                            onChange={(e) => setComments((prev) => ({ ...prev, [area]: e.target.value }))}
                            placeholder="Comment (optional)…"
                            className="text-xs border border-slate-200 rounded-lg px-3 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-teal-400 text-slate-700"
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Overall comment */}
              <div className="px-6 py-4 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-700 mb-2">Overall Comment</p>
                <textarea
                  value={overallComment}
                  onChange={(e) => setOverallComment(e.target.value)}
                  placeholder="Write an overall comment for this child's term…"
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              {/* Actions */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  {buildSubjects().length} area{buildSubjects().length !== 1 ? 's' : ''} graded
                </p>
                <div className="flex gap-2">
                  <button onClick={() => handleSave(false)} disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    <Save size={14} /> Save Draft
                  </button>
                  <button onClick={() => handleSave(true)} disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg">
                    <CheckCircle2 size={14} /> Publish to Parent
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
