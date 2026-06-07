'use client'

import { useState, useMemo } from 'react'
import { format, subMonths } from 'date-fns'
import { useAuthStore } from '@store/auth.store'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@lib/supabase'
import { FileText, ChevronDown } from 'lucide-react'

type Child = { id: string; first_name: string; last_name: string }
type ScoreEntry = { score: string; is_absent: boolean; plan: { name: string; development_area: string | null; score_labels: string[] } | null }

function computeRecommendation(scores: ScoreEntry[]): { label: string; score: number; total: number } | null {
  const valid = scores.filter((s) => !s.is_absent && s.score !== 'Absent' && s.plan)
  if (valid.length === 0) return null
  const weighted = valid.map((s, i) => {
    const labels = s.plan!.score_labels as string[]
    const idx = labels.indexOf(s.score)
    const weight = (i + 1) / valid.length
    return { idx, max: labels.length - 1, weight }
  })
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0)
  const score = weighted.reduce((sum, w) => sum + (w.idx / w.max) * w.weight, 0) / totalWeight
  const labels = valid[valid.length - 1].plan!.score_labels as string[]
  const recIdx = Math.round(score * (labels.length - 1))
  return { label: labels[Math.min(recIdx, labels.length - 1)], score: Math.round(score * 100), total: valid.length }
}

function ChildRow({ child, periodFrom, periodTo, onSelect, selected }: {
  child: Child; periodFrom: string; periodTo: string; onSelect: () => void; selected: boolean
}) {
  const { data: scores = [] } = useQuery({
    queryKey: ['child-assessment-scores', child.id, periodFrom, periodTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('assessment_scores')
        .select('score, is_absent, session:assessment_sessions!inner(session_date, plan:assessment_plans(name, development_area, score_labels))')
        .eq('child_id', child.id)
        .gte('session.session_date', periodFrom)
        .lte('session.session_date', periodTo)
      return (data ?? []).map((d: any) => ({ score: d.score, is_absent: d.is_absent, plan: d.session?.plan ?? null }))
    },
    staleTime: 60 * 1000,
  })

  const rec = useMemo(() => computeRecommendation(scores), [scores])
  const initials = `${child.first_name[0]}${child.last_name[0]}`.toUpperCase()

  return (
    <button onClick={onSelect} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${selected ? 'bg-teal-50 border-teal-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
      <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
        <span className="text-teal-700 font-bold text-sm">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm">{child.first_name} {child.last_name}</p>
        {rec ? (
          <p className="text-xs text-slate-500">Suggested: <span className="font-semibold text-teal-700">{rec.label}</span> · {rec.total} sessions</p>
        ) : (
          <p className="text-xs text-slate-400">No assessment data</p>
        )}
      </div>
      <ChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform ${selected ? 'rotate-180' : ''}`} />
    </button>
  )
}

export default function TeacherReportCardsPage() {
  const { profile } = useAuthStore()
  const [periodFrom, setPeriodFrom] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'))
  const [periodTo, setPeriodTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)

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
      const { data } = await supabase.from('children').select('id, first_name, last_name').in('classroom_id', classroomIds).order('first_name')
      return (data ?? []) as Child[]
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText size={24} className="text-teal-600" />
          Report Cards
        </h1>
        <p className="text-sm text-slate-500 mt-1">Pull assessment data to inform grades and generate report card comments</p>
      </div>

      {/* Period selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 flex-wrap">
        <span className="text-sm font-semibold text-slate-600">Period:</span>
        <div className="flex items-center gap-2">
          <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400" />
          <span className="text-slate-400">→</span>
          <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div className="flex gap-2">
          {[
            { label: 'Term 1', from: format(new Date(new Date().getFullYear(), 0, 15), 'yyyy-MM-dd'), to: format(new Date(new Date().getFullYear(), 3, 30), 'yyyy-MM-dd') },
            { label: 'Term 2', from: format(new Date(new Date().getFullYear(), 4, 1), 'yyyy-MM-dd'), to: format(new Date(new Date().getFullYear(), 7, 31), 'yyyy-MM-dd') },
            { label: 'Term 3', from: format(new Date(new Date().getFullYear(), 8, 1), 'yyyy-MM-dd'), to: format(new Date(new Date().getFullYear(), 11, 5), 'yyyy-MM-dd') },
          ].map(({ label, from, to }) => (
            <button key={label} onClick={() => { setPeriodFrom(from); setPeriodTo(to) }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* AI notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">✨ AI Report Card Comments — Coming Soon</p>
        <p className="text-xs text-amber-700">In Phase 2, you'll be able to click "Generate Comment" to get an AI-drafted paragraph for each child. For now, use the suggested score as a starting point and write your comments manually.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading class…</div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{children.length} Children</p>
          {children.map((child) => (
            <ChildRow
              key={child.id}
              child={child}
              periodFrom={periodFrom}
              periodTo={periodTo}
              selected={selectedChildId === child.id}
              onSelect={() => setSelectedChildId(selectedChildId === child.id ? null : child.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
