'use client'

import { useState, useMemo } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { useAuthStore } from '@store/auth.store'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lib/supabase'
import { useCompletionStats, useAllSchoolPlans } from '@hooks/useAssessments'
import { BarChart2, ChevronDown, ChevronUp, CheckCircle2, Clock, XCircle } from 'lucide-react'

type Period = 'today' | 'week' | 'month'
type Classroom = { id: string; name: string }
type PlanWithStatus = { id: string; name: string; status: 'completed' | 'in_progress' | 'not_started'; session_date?: string }

function PeriodDates(period: Period): { from: string; to: string } {
  const now = new Date()
  if (period === 'today') return { from: format(now, 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') }
  if (period === 'week') return { from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') }
  return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') }
}

function ClassroomRow({ classroom, from, to, allPlans, stats }: {
  classroom: Classroom
  from: string
  to: string
  allPlans: any[]
  stats: any
}) {
  const [expanded, setExpanded] = useState(false)

  const classPlans = useMemo(() => allPlans.filter((p) => p.classroom_id === classroom.id), [allPlans, classroom.id])

  const { data: sessions = [] } = useQuery({
    queryKey: ['classroom-sessions', classroom.id, from, to],
    queryFn: async () => {
      const { data } = await supabase
        .from('assessment_sessions')
        .select('id, plan_id, status, session_date')
        .eq('classroom_id', classroom.id)
        .gte('session_date', from)
        .lte('session_date', to)
      return data ?? []
    },
  })

  const sessionByPlanId = useMemo(() => {
    const map = new Map<string, any>()
    sessions.forEach((s: any) => map.set(s.plan_id, s))
    return map
  }, [sessions])

  const plansWithStatus: PlanWithStatus[] = useMemo(() =>
    classPlans.map((p) => {
      const s = sessionByPlanId.get(p.id)
      return { id: p.id, name: p.name, status: s ? s.status : 'not_started', session_date: s?.session_date }
    }), [classPlans, sessionByPlanId])

  const completed = plansWithStatus.filter((p) => p.status === 'completed').length
  const total = plansWithStatus.length
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 text-left">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{classroom.name}</p>
          <p className="text-xs text-slate-400">{completed}/{total} assessments complete</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
            <div className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
              style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-sm font-bold w-10 text-right ${pct >= 80 ? 'text-green-700' : pct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
            {pct}%
          </span>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {expanded && plansWithStatus.length > 0 && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {plansWithStatus.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-2.5">
              {p.status === 'completed' && <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />}
              {p.status === 'in_progress' && <Clock size={14} className="text-amber-500 flex-shrink-0" />}
              {p.status === 'not_started' && <XCircle size={14} className="text-slate-300 flex-shrink-0" />}
              <p className="text-sm text-slate-700 flex-1">{p.name}</p>
              <span className={`text-xs font-semibold ${p.status === 'completed' ? 'text-green-600' : p.status === 'in_progress' ? 'text-amber-600' : 'text-slate-400'}`}>
                {p.status === 'completed' ? 'Done' : p.status === 'in_progress' ? 'In Progress' : 'Not Started'}
              </span>
              {p.session_date && <span className="text-xs text-slate-400">{format(new Date(p.session_date), 'MMM d')}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AssessmentReportsPage() {
  const { profile } = useAuthStore()
  const schoolId = profile?.school_id ?? null
  const [period, setPeriod] = useState<Period>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  const periodDates = useMemo(() => {
    if (useCustom && customFrom && customTo) return { from: customFrom, to: customTo }
    return PeriodDates(period)
  }, [period, useCustom, customFrom, customTo])

  const { data: classrooms = [] } = useQuery({
    queryKey: ['classrooms', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase.from('classrooms').select('id, name').eq('school_id', schoolId!).order('name')
      return (data ?? []) as Classroom[]
    },
  })

  const { data: allPlans = [], isLoading: plansLoading } = useAllSchoolPlans(schoolId)

  const { data: completedSessions = [] } = useQuery({
    queryKey: ['all-completed-sessions', schoolId, periodDates.from, periodDates.to],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase
        .from('assessment_sessions')
        .select('id, classroom_id, status')
        .eq('school_id', schoolId!)
        .eq('status', 'completed')
        .gte('session_date', periodDates.from)
        .lte('session_date', periodDates.to)
      return data ?? []
    },
  })

  const overallStats = useMemo(() => {
    if (classrooms.length === 0 || allPlans.length === 0) return { pct: 0, above80: 0 }
    let totalPlans = 0
    let totalCompleted = 0
    let above80 = 0

    classrooms.forEach((c) => {
      const classPlans = allPlans.filter((p: any) => p.classroom_id === c.id)
      const classCompleted = completedSessions.filter((s: any) => s.classroom_id === c.id).length
      totalPlans += classPlans.length
      totalCompleted += classCompleted
      const pct = classPlans.length === 0 ? 0 : (classCompleted / classPlans.length) * 100
      if (pct >= 80) above80++
    })

    return { pct: totalPlans === 0 ? 0 : Math.round((totalCompleted / totalPlans) * 100), above80 }
  }, [classrooms, allPlans, completedSessions])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart2 size={24} className="text-teal-600" />
          Assessment Completion
        </h1>
        <p className="text-sm text-slate-500 mt-1">Track how well your school is completing scheduled assessments</p>
      </div>

      {/* Period filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['today', 'week', 'month'] as Period[]).map((p) => (
            <button key={p} onClick={() => { setPeriod(p); setUseCustom(false) }}
              className={`px-3 py-1 rounded-md text-xs font-semibold capitalize ${!useCustom && period === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true) }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400" />
          <span className="text-slate-400">→</span>
          <input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true) }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`rounded-xl p-5 border ${overallStats.pct >= 80 ? 'bg-green-50 border-green-200' : overallStats.pct >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-3xl font-bold ${overallStats.pct >= 80 ? 'text-green-700' : overallStats.pct >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
            {overallStats.pct}%
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Overall Completion</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-3xl font-bold text-slate-900">{overallStats.above80}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Classrooms Above 80%</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-3xl font-bold text-slate-900">{classrooms.length}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">Total Classrooms</p>
        </div>
      </div>

      {/* Per-classroom breakdown */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">By Classroom</p>
        {plansLoading ? (
          <div className="text-center py-12 text-slate-400">Loading…</div>
        ) : classrooms.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No classrooms found</div>
        ) : (
          <div className="space-y-3">
            {classrooms.map((c) => (
              <ClassroomRow key={c.id} classroom={c} from={periodDates.from} to={periodDates.to} allPlans={allPlans} stats={overallStats} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
