'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '@lib/supabase'
import { queryKeys } from '@lib/query-client'
import type {
  AssessmentTemplate,
  AssessmentPlan,
  AssessmentSession,
  AssessmentSessionWithPlan,
  AssessmentScore,
  AssessmentScoreWithChild,
  AssessmentPack,
  AssessmentPackWithTemplates,
  ChildObservation,
  ChildObservationWithChildren,
  Achievement,
  ChildAchievement,
  ChildAchievementWithDetails,
  ClassroomDailyLog,
  AssessmentFrequency,
  DevelopmentArea,
  AssessmentPlanApprovalStatus,
  PlanSubmission,
  PlanSubmissionWithDetails,
  ReportCard,
  ReportSubject,
} from '@/types/database'

const today = () => format(new Date(), 'yyyy-MM-dd')

function isDueTodayFilter(plan: AssessmentPlan): boolean {
  if (!plan.is_active) return false
  if (plan.approval_status !== 'approved') return false
  const dow = new Date().getDay()
  const dom = new Date().getDate()
  const t = today()
  switch (plan.frequency) {
    case 'daily': return true
    case 'weekly': return plan.day_of_week === dow
    case 'monthly': return plan.day_of_month === dom
    case 'once': return plan.scheduled_date === t
    case 'term': return plan.scheduled_date === t
    default: return false
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function useAssessmentTemplates(schoolId: string | null) {
  return useQuery({
    queryKey: queryKeys.assessments.templates(schoolId ?? ''),
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_templates')
        .select('*')
        .or(`school_id.eq.${schoolId},is_system.eq.true`)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as AssessmentTemplate[]
    },
  })
}

export function useCreateAssessmentTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      schoolId: string
      name: string
      activity?: string
      developmentArea?: DevelopmentArea
      learningOutcome?: string
      criteria?: string
      scoringMethod?: string
      scoreLabels?: string[]
      defaultScore?: string
      createdBy: string
    }) => {
      const { data, error } = await supabase
        .from('assessment_templates')
        .insert({
          school_id: input.schoolId,
          name: input.name,
          activity: input.activity ?? null,
          development_area: input.developmentArea ?? null,
          learning_outcome: input.learningOutcome ?? null,
          criteria: input.criteria ?? null,
          scoring_method: input.scoringMethod ?? 'rubric_4',
          score_labels: input.scoreLabels ?? ['Not Observed', 'Needs Support', 'Developing', 'Achieved'],
          default_score: input.defaultScore ?? 'Achieved',
          created_by: input.createdBy,
        })
        .select()
        .single()
      if (error) throw error
      return data as AssessmentTemplate
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.templates(vars.schoolId) })
    },
  })
}

export function useUpdateAssessmentTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; schoolId: string; name?: string; isActive?: boolean; developmentArea?: DevelopmentArea | null; criteria?: string | null }) => {
      const { error } = await supabase
        .from('assessment_templates')
        .update({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
          ...(input.developmentArea !== undefined ? { development_area: input.developmentArea } : {}),
          ...(input.criteria !== undefined ? { criteria: input.criteria } : {}),
        })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.templates(vars.schoolId) })
    },
  })
}

// ── Packs ─────────────────────────────────────────────────────────────────────

export function useAssessmentPacks() {
  return useQuery({
    queryKey: queryKeys.assessments.packs(),
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_packs')
        .select('*, pack_templates:assessment_pack_templates(*, template:assessment_templates(*))')
        .eq('is_active', true)
        .order('is_system', { ascending: false })
        .order('name')
      if (error) throw error
      return (data ?? []) as AssessmentPackWithTemplates[]
    },
  })
}

export function useApplyPackToClassrooms() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      pack: AssessmentPackWithTemplates
      classroomIds: string[]
      schoolId: string
      createdBy: string
      startDate: string
    }) => {
      const rows: Record<string, unknown>[] = []
      for (const classroomId of input.classroomIds) {
        for (const pt of input.pack.pack_templates) {
          const t = pt.template
          const d = new Date(input.startDate)
          rows.push({
            school_id: input.schoolId,
            classroom_id: classroomId,
            template_id: t.id,
            pack_id: input.pack.id,
            name: t.name,
            activity: t.activity,
            development_area: t.development_area,
            learning_outcome: t.learning_outcome,
            criteria: t.criteria,
            scoring_method: t.scoring_method,
            score_labels: t.score_labels,
            default_score: t.default_score,
            frequency: pt.default_frequency,
            scheduled_date: input.startDate,
            day_of_week: pt.default_frequency === 'weekly' ? d.getDay() : null,
            day_of_month: pt.default_frequency === 'monthly' ? d.getDate() : null,
            created_by: input.createdBy,
          })
        }
      }
      const { error } = await supabase.from('assessment_plans').insert(rows)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      for (const cid of vars.classroomIds) {
        qc.invalidateQueries({ queryKey: queryKeys.assessments.plans(cid) })
      }
      qc.invalidateQueries({ queryKey: queryKeys.assessments.allPlans(vars.schoolId) })
    },
  })
}

// ── Plans ─────────────────────────────────────────────────────────────────────

export function useMyAssessmentPlans(classroomIds: string[]) {
  const key = classroomIds.join(',')
  return useQuery({
    queryKey: queryKeys.assessments.plans(key),
    enabled: classroomIds.length > 0,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_plans')
        .select('*')
        .in('classroom_id', classroomIds)
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .order('name')
      if (error) throw error
      return (data ?? []) as AssessmentPlan[]
    },
  })
}

export function useTodaysDuePlans(classroomIds: string[]) {
  const key = classroomIds.join(',')
  return useQuery({
    queryKey: [...queryKeys.assessments.plans(key), 'due', today()],
    enabled: classroomIds.length > 0,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_plans')
        .select('*')
        .in('classroom_id', classroomIds)
        .eq('is_active', true)
        .eq('approval_status', 'approved')
      if (error) throw error
      return (data ?? [] as AssessmentPlan[]).filter(isDueTodayFilter)
    },
  })
}

export function useAllSchoolPlans(schoolId: string | null) {
  return useQuery({
    queryKey: queryKeys.assessments.allPlans(schoolId ?? ''),
    enabled: !!schoolId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_plans')
        .select('*, classroom:classrooms(id, name)')
        .eq('school_id', schoolId!)
        .order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateAssessmentPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      schoolId: string
      classroomId: string
      templateId?: string
      name: string
      activity?: string
      developmentArea?: DevelopmentArea
      learningOutcome?: string
      criteria?: string
      scoringMethod?: string
      scoreLabels?: string[]
      defaultScore?: string
      frequency: AssessmentFrequency
      scheduledDate: string
      createdBy: string
      submittedByTeacher?: boolean
    }) => {
      const d = new Date(input.scheduledDate)
      const approvalStatus: AssessmentPlanApprovalStatus = input.submittedByTeacher ? 'pending_approval' : 'approved'
      const { data, error } = await supabase
        .from('assessment_plans')
        .insert({
          school_id: input.schoolId,
          classroom_id: input.classroomId,
          template_id: input.templateId ?? null,
          name: input.name,
          activity: input.activity ?? null,
          development_area: input.developmentArea ?? null,
          learning_outcome: input.learningOutcome ?? null,
          criteria: input.criteria ?? null,
          scoring_method: input.scoringMethod ?? 'rubric_4',
          score_labels: input.scoreLabels ?? ['Not Observed', 'Needs Support', 'Developing', 'Achieved'],
          default_score: input.defaultScore ?? 'Achieved',
          frequency: input.frequency,
          scheduled_date: input.scheduledDate,
          day_of_week: input.frequency === 'weekly' ? d.getDay() : null,
          day_of_month: input.frequency === 'monthly' ? d.getDate() : null,
          created_by: input.createdBy,
          approval_status: approvalStatus,
        })
        .select()
        .single()
      if (error) throw error
      // Notify admins when a teacher submits a plan for approval
      if (input.submittedByTeacher && data) {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('school_id', input.schoolId)
          .eq('role', 'school_admin')
        for (const admin of admins ?? []) {
          await supabase.from('notifications').insert({
            user_id: admin.id,
            school_id: input.schoolId,
            type: 'plan_submitted',
            title: 'New assessment plan submitted',
            body: `A teacher submitted "${input.name}" for your approval.`,
            data: { plan_id: data.id },
            is_read: false,
          })
        }
      }
      return data as AssessmentPlan
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.plans(vars.classroomId) })
      qc.invalidateQueries({ queryKey: queryKeys.assessments.allPlans(vars.schoolId) })
      if (vars.submittedByTeacher) {
        qc.invalidateQueries({ queryKey: queryKeys.assessments.pendingPlans(vars.schoolId) })
      }
    },
  })
}

export function useUpdateAssessmentPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; schoolId: string; classroomId: string; isActive?: boolean; name?: string }) => {
      const { error } = await supabase
        .from('assessment_plans')
        .update({
          ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
        })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.plans(vars.classroomId) })
      qc.invalidateQueries({ queryKey: queryKeys.assessments.allPlans(vars.schoolId) })
    },
  })
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export function useTodaysSessions(classroomIds: string[]) {
  const key = classroomIds.join(',')
  return useQuery({
    queryKey: queryKeys.assessments.sessions(key, today()),
    enabled: classroomIds.length > 0,
    staleTime: 15 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_sessions')
        .select('*, plan:assessment_plans(id, name, development_area, score_labels, default_score, criteria, scoring_method)')
        .in('classroom_id', classroomIds)
        .eq('session_date', today())
      if (error) throw error
      return (data ?? []) as AssessmentSessionWithPlan[]
    },
  })
}

export function useSession(planId: string | null, sessionDate: string) {
  return useQuery({
    queryKey: queryKeys.assessments.session(planId ?? '', sessionDate),
    enabled: !!planId,
    staleTime: 10 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_sessions')
        .select('*, plan:assessment_plans(id, name, development_area, score_labels, default_score, criteria, scoring_method)')
        .eq('plan_id', planId!)
        .eq('session_date', sessionDate)
        .maybeSingle()
      if (error) throw error
      return data as AssessmentSessionWithPlan | null
    },
  })
}

export function useCreateOrOpenSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      schoolId: string
      planId: string
      classroomId: string
      teacherId: string
      sessionDate: string
    }) => {
      const { data: existing } = await supabase
        .from('assessment_sessions')
        .select('*, plan:assessment_plans(id, name, development_area, score_labels, default_score, criteria, scoring_method)')
        .eq('plan_id', input.planId)
        .eq('session_date', input.sessionDate)
        .maybeSingle()
      if (existing) return existing as AssessmentSessionWithPlan
      const { data, error } = await supabase
        .from('assessment_sessions')
        .insert({
          school_id: input.schoolId,
          plan_id: input.planId,
          classroom_id: input.classroomId,
          teacher_id: input.teacherId,
          session_date: input.sessionDate,
          status: 'in_progress',
        })
        .select('*, plan:assessment_plans(id, name, development_area, score_labels, default_score, criteria, scoring_method)')
        .single()
      if (error) throw error
      return data as AssessmentSessionWithPlan
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.session(vars.planId, vars.sessionDate) })
      qc.invalidateQueries({ queryKey: queryKeys.assessments.sessions(vars.classroomId, vars.sessionDate) })
    },
  })
}

export function useCompleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { sessionId: string; planId: string; classroomId: string; sessionDate: string; bulkNote?: string }) => {
      const { error } = await supabase
        .from('assessment_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString(), bulk_note: input.bulkNote ?? null })
        .eq('id', input.sessionId)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.session(vars.planId, vars.sessionDate) })
      qc.invalidateQueries({ queryKey: queryKeys.assessments.sessions(vars.classroomId, vars.sessionDate) })
    },
  })
}

// ── Scores ────────────────────────────────────────────────────────────────────

export function useSessionScores(sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.assessments.scores(sessionId ?? ''),
    enabled: !!sessionId,
    staleTime: 5 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_scores')
        .select('*, child:children(id, first_name, last_name, avatar_url)')
        .eq('session_id', sessionId!)
      if (error) throw error
      return (data ?? []) as AssessmentScoreWithChild[]
    },
  })
}

export function useBulkUpsertScores() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      sessionId: string
      schoolId: string
      scores: Array<{ childId: string; score: string; isAbsent?: boolean; notes?: string | null }>
      assessedBy: string
    }) => {
      const rows = input.scores.map((s) => ({
        session_id: input.sessionId,
        school_id: input.schoolId,
        child_id: s.childId,
        score: s.score,
        is_absent: s.isAbsent ?? false,
        notes: s.notes ?? null,
        assessed_by: input.assessedBy,
      }))
      const { error } = await supabase
        .from('assessment_scores')
        .upsert(rows, { onConflict: 'session_id,child_id' })
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.scores(vars.sessionId) })
    },
  })
}

// ── Observations ──────────────────────────────────────────────────────────────

export function useChildObservations(childId: string | null) {
  return useQuery({
    queryKey: queryKeys.assessments.observations(childId ?? ''),
    enabled: !!childId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_observation_children')
        .select('observation_id, observation:child_observations(*, observer:profiles!observed_by(id, full_name))')
        .eq('child_id', childId!)
      if (error) throw error
      return (data ?? []).map((r: any) => r.observation).filter(Boolean) as ChildObservation[]
    },
  })
}

export function useClassroomObservations(classroomId: string | null) {
  return useQuery({
    queryKey: queryKeys.assessments.classroomObservations(classroomId ?? ''),
    enabled: !!classroomId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_observations')
        .select('*, observer:profiles!observed_by(id, full_name), children:child_observation_children(child_id, child:children(id, first_name, last_name))')
        .eq('classroom_id', classroomId!)
        .order('observed_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as ChildObservationWithChildren[]
    },
  })
}

export function useCreateObservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      schoolId: string
      classroomId?: string
      observedBy: string
      childIds: string[]
      observation: string
      developmentArea?: DevelopmentArea
      photoUrl?: string
      isPublished?: boolean
    }) => {
      const isGroup = input.childIds.length > 1
      const { data: obs, error: obsErr } = await supabase
        .from('child_observations')
        .insert({
          school_id: input.schoolId,
          classroom_id: input.classroomId ?? null,
          observed_by: input.observedBy,
          development_area: input.developmentArea ?? null,
          observation: input.observation,
          photo_url: input.photoUrl ?? null,
          is_group: isGroup,
          is_published: input.isPublished ?? false,
        })
        .select()
        .single()
      if (obsErr) throw obsErr
      const links = input.childIds.map((childId) => ({ observation_id: obs.id, child_id: childId }))
      const { error: linkErr } = await supabase.from('child_observation_children').insert(links)
      if (linkErr) throw linkErr
      return obs as ChildObservation
    },
    onSuccess: (_, vars) => {
      for (const cid of vars.childIds) {
        qc.invalidateQueries({ queryKey: queryKeys.assessments.observations(cid) })
      }
      if (vars.classroomId) {
        qc.invalidateQueries({ queryKey: queryKeys.assessments.classroomObservations(vars.classroomId) })
      }
    },
  })
}

// ── Achievements ──────────────────────────────────────────────────────────────

export function useAchievements(schoolId: string | null) {
  return useQuery({
    queryKey: queryKeys.assessments.achievements(schoolId ?? ''),
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('school_id', schoolId!)
        .eq('is_active', true)
        .order('category')
        .order('name')
      if (error) throw error
      return (data ?? []) as Achievement[]
    },
  })
}

export function useCreateAchievement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { schoolId: string; name: string; description?: string; emoji?: string; category?: string; createdBy: string }) => {
      const { data, error } = await supabase
        .from('achievements')
        .insert({
          school_id: input.schoolId,
          name: input.name,
          description: input.description ?? null,
          emoji: input.emoji ?? '⭐',
          category: input.category ?? 'general',
          created_by: input.createdBy,
        })
        .select()
        .single()
      if (error) throw error
      return data as Achievement
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.achievements(vars.schoolId) })
    },
  })
}

export function useUpdateAchievement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; schoolId: string; name?: string; emoji?: string; description?: string; isActive?: boolean }) => {
      const { error } = await supabase
        .from('achievements')
        .update({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
        })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.achievements(vars.schoolId) })
    },
  })
}

export function useChildAchievements(childId: string | null) {
  return useQuery({
    queryKey: queryKeys.assessments.childAchievements(childId ?? ''),
    enabled: !!childId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_achievements')
        .select('*, achievement:achievements(id, name, emoji, category), awarder:profiles!awarded_by(id, full_name)')
        .eq('child_id', childId!)
        .order('awarded_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ChildAchievementWithDetails[]
    },
  })
}

export function useAwardAchievement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { schoolId: string; childId: string; achievementId: string; awardedBy: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('child_achievements')
        .insert({
          school_id: input.schoolId,
          child_id: input.childId,
          achievement_id: input.achievementId,
          awarded_by: input.awardedBy,
          notes: input.notes ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as ChildAchievement
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.childAchievements(vars.childId) })
    },
  })
}

// ── Daily logs ────────────────────────────────────────────────────────────────

export function useDailyLog(classroomId: string | null, logDate: string) {
  return useQuery({
    queryKey: queryKeys.assessments.dailyLog(classroomId ?? '', logDate),
    enabled: !!classroomId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classroom_daily_logs')
        .select('*')
        .eq('classroom_id', classroomId!)
        .eq('log_date', logDate)
        .maybeSingle()
      if (error) throw error
      return data as ClassroomDailyLog | null
    },
  })
}

export function useUpsertDailyLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { schoolId: string; classroomId: string; logDate: string; summary: string; isPublished: boolean; createdBy: string }) => {
      const { error } = await supabase
        .from('classroom_daily_logs')
        .upsert(
          {
            school_id: input.schoolId,
            classroom_id: input.classroomId,
            log_date: input.logDate,
            summary: input.summary,
            is_published: input.isPublished,
            published_at: input.isPublished ? new Date().toISOString() : null,
            created_by: input.createdBy,
          },
          { onConflict: 'classroom_id,log_date' },
        )
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.dailyLog(vars.classroomId, vars.logDate) })
    },
  })
}

// ── Plan approval workflow ────────────────────────────────────────────────────

export function useMyPendingPlans(classroomIds: string[]) {
  const key = classroomIds.join(',')
  return useQuery({
    queryKey: [...queryKeys.assessments.pendingPlans(key)],
    enabled: classroomIds.length > 0,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_plans')
        .select('*')
        .in('classroom_id', classroomIds)
        .in('approval_status', ['pending_approval', 'rejected'])
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as AssessmentPlan[]
    },
  })
}

export function usePendingApprovalPlans(schoolId: string | null) {
  return useQuery({
    queryKey: queryKeys.assessments.pendingPlans(schoolId ?? ''),
    enabled: !!schoolId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_plans')
        .select('*, classroom:classrooms(id, name), creator:profiles!created_by(id, full_name)')
        .eq('school_id', schoolId!)
        .eq('approval_status', 'pending_approval')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useApprovePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      planId: string
      schoolId: string
      approvedBy: string
      teacherId: string
      planName: string
    }) => {
      const { error } = await supabase
        .from('assessment_plans')
        .update({
          approval_status: 'approved',
          approved_by: input.approvedBy,
          approved_at: new Date().toISOString(),
        })
        .eq('id', input.planId)
      if (error) throw error
      await supabase.from('notifications').insert({
        user_id: input.teacherId,
        school_id: input.schoolId,
        type: 'plan_approved',
        title: 'Assessment plan approved',
        body: `Your plan "${input.planName}" has been approved and is now active.`,
        data: { plan_id: input.planId },
        is_read: false,
      })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.pendingPlans(vars.schoolId) })
      qc.invalidateQueries({ queryKey: queryKeys.assessments.allPlans(vars.schoolId) })
    },
  })
}

export function useRejectPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      planId: string
      schoolId: string
      rejectedBy: string
      teacherId: string
      planName: string
      rejectionReason?: string
    }) => {
      const { error } = await supabase
        .from('assessment_plans')
        .update({
          approval_status: 'rejected',
          rejected_by: input.rejectedBy,
          rejected_at: new Date().toISOString(),
          rejection_reason: input.rejectionReason ?? null,
        })
        .eq('id', input.planId)
      if (error) throw error
      await supabase.from('notifications').insert({
        user_id: input.teacherId,
        school_id: input.schoolId,
        type: 'plan_rejected',
        title: 'Assessment plan needs revision',
        body: `Your plan "${input.planName}" was not approved${input.rejectionReason ? `: ${input.rejectionReason}` : '.'}`,
        data: { plan_id: input.planId },
        is_read: false,
      })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.pendingPlans(vars.schoolId) })
      qc.invalidateQueries({ queryKey: queryKeys.assessments.allPlans(vars.schoolId) })
    },
  })
}

// ── Plan submission workflow (teacher submits multi-item plans) ───────────────

export function useMyPlanSubmissions(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.assessments.mySubmissions(userId ?? ''),
    enabled: !!userId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_submissions')
        .select('*, classroom:classrooms(id, name), items:assessment_plans(*)')
        .eq('submitted_by', userId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as PlanSubmissionWithDetails[]
    },
  })
}

export function usePendingPlanSubmissions(schoolId: string | null) {
  return useQuery({
    queryKey: queryKeys.assessments.pendingSubmissions(schoolId ?? ''),
    enabled: !!schoolId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_submissions')
        .select('*, classroom:classrooms(id, name), submitter:profiles!submitted_by(id, full_name), items:assessment_plans(*)')
        .eq('school_id', schoolId!)
        .eq('approval_status', 'pending_approval')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as PlanSubmissionWithDetails[]
    },
  })
}

export function useSubmitAssessmentPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      schoolId: string
      classroomId: string
      submittedBy: string
      name: string
      term: string | null
      items: Array<{
        templateId?: string
        name: string
        activity?: string
        developmentArea?: DevelopmentArea
        criteria?: string
        frequency: AssessmentFrequency
        scheduledDate: string
      }>
    }) => {
      // Create the submission header
      const { data: submission, error: subErr } = await supabase
        .from('plan_submissions')
        .insert({
          school_id: input.schoolId,
          classroom_id: input.classroomId,
          submitted_by: input.submittedBy,
          name: input.name,
          term: input.term,
          approval_status: 'pending_approval',
        })
        .select()
        .single()
      if (subErr) throw subErr

      // Create individual assessment plan items linked to the submission
      const rows = input.items.map((item) => {
        const d = new Date(item.scheduledDate)
        return {
          school_id: input.schoolId,
          classroom_id: input.classroomId,
          template_id: item.templateId ?? null,
          submission_id: submission.id,
          name: item.name,
          activity: item.activity ?? null,
          development_area: item.developmentArea ?? null,
          criteria: item.criteria ?? null,
          scoring_method: 'rubric_4',
          score_labels: ['Not Observed', 'Needs Support', 'Developing', 'Achieved'],
          default_score: 'Achieved',
          frequency: item.frequency,
          scheduled_date: item.scheduledDate,
          day_of_week: item.frequency === 'weekly' ? d.getDay() : null,
          day_of_month: item.frequency === 'monthly' ? d.getDate() : null,
          created_by: input.submittedBy,
          approval_status: 'pending_approval' as AssessmentPlanApprovalStatus,
        }
      })

      const { error: plansErr } = await supabase.from('assessment_plans').insert(rows)
      if (plansErr) throw plansErr

      // Notify all school admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('school_id', input.schoolId)
        .eq('role', 'school_admin')
      for (const admin of admins ?? []) {
        await supabase.from('notifications').insert({
          user_id: admin.id,
          school_id: input.schoolId,
          type: 'plan_submitted',
          title: 'New assessment plan submitted',
          body: `A teacher submitted "${input.name}" for your approval.`,
          data: { submission_id: submission.id },
          is_read: false,
        })
      }
      return submission as PlanSubmission
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.mySubmissions(vars.submittedBy) })
      qc.invalidateQueries({ queryKey: queryKeys.assessments.pendingSubmissions(vars.schoolId) })
    },
  })
}

export function useApproveSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      submissionId: string
      schoolId: string
      approvedBy: string
      submittedBy: string
      planName: string
    }) => {
      const now = new Date().toISOString()
      // Approve the submission
      const { error: subErr } = await supabase
        .from('plan_submissions')
        .update({ approval_status: 'approved', approved_by: input.approvedBy, approved_at: now })
        .eq('id', input.submissionId)
      if (subErr) throw subErr
      // Approve all linked plans
      const { error: plansErr } = await supabase
        .from('assessment_plans')
        .update({ approval_status: 'approved', approved_by: input.approvedBy, approved_at: now })
        .eq('submission_id', input.submissionId)
      if (plansErr) throw plansErr
      // Notify the teacher
      if (input.submittedBy) {
        await supabase.from('notifications').insert({
          user_id: input.submittedBy,
          school_id: input.schoolId,
          type: 'plan_approved',
          title: 'Assessment plan approved',
          body: `Your plan "${input.planName}" has been approved and is now active.`,
          data: { submission_id: input.submissionId },
          is_read: false,
        })
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.pendingSubmissions(vars.schoolId) })
      qc.invalidateQueries({ queryKey: queryKeys.assessments.allPlans(vars.schoolId) })
    },
  })
}

export function useRejectSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      submissionId: string
      schoolId: string
      rejectedBy: string
      submittedBy: string
      planName: string
      rejectionReason?: string
    }) => {
      const now = new Date().toISOString()
      const { error: subErr } = await supabase
        .from('plan_submissions')
        .update({
          approval_status: 'rejected',
          rejected_by: input.rejectedBy,
          rejected_at: now,
          rejection_reason: input.rejectionReason ?? null,
        })
        .eq('id', input.submissionId)
      if (subErr) throw subErr
      const { error: plansErr } = await supabase
        .from('assessment_plans')
        .update({
          approval_status: 'rejected',
          rejected_by: input.rejectedBy,
          rejected_at: now,
          rejection_reason: input.rejectionReason ?? null,
        })
        .eq('submission_id', input.submissionId)
      if (plansErr) throw plansErr
      if (input.submittedBy) {
        await supabase.from('notifications').insert({
          user_id: input.submittedBy,
          school_id: input.schoolId,
          type: 'plan_rejected',
          title: 'Assessment plan needs revision',
          body: `Your plan "${input.planName}" needs revision${input.rejectionReason ? `: ${input.rejectionReason}` : '.'}`,
          data: { submission_id: input.submissionId },
          is_read: false,
        })
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.assessments.pendingSubmissions(vars.schoolId) })
    },
  })
}

// ── Completion stats (admin) ──────────────────────────────────────────────────

export function useCompletionStats(schoolId: string | null, dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: [...queryKeys.assessments.completionStats(schoolId ?? ''), dateFrom, dateTo],
    enabled: !!schoolId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_sessions')
        .select('id, classroom_id, status, session_date, classroom:classrooms(id, name)')
        .eq('school_id', schoolId!)
        .gte('session_date', dateFrom)
        .lte('session_date', dateTo)
        .order('session_date', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

// ── Report Cards ───────────────────────────────────────────────────────────────

export function useChildReportCards(childId: string | null) {
  return useQuery({
    queryKey: ['report-cards', 'child', childId ?? ''],
    enabled: !!childId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_cards')
        .select('*')
        .eq('child_id', childId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ReportCard[]
    },
  })
}

export function useSaveReportCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      childId: string
      schoolId: string
      createdBy: string
      period: string
      subjects: ReportSubject[]
      overallComment: string | null
      publish: boolean
    }) => {
      const { data: existing } = await supabase
        .from('report_cards')
        .select('id')
        .eq('child_id', input.childId)
        .eq('period', input.period)
        .maybeSingle()

      const payload: Record<string, unknown> = {
        child_id: input.childId,
        school_id: input.schoolId,
        created_by: input.createdBy,
        period: input.period,
        subjects: input.subjects,
        overall_comment: input.overallComment,
        is_published: input.publish,
      }
      if (input.publish) payload.published_at = new Date().toISOString()

      let card: ReportCard
      if (existing?.id) {
        const { data, error } = await supabase
          .from('report_cards').update(payload).eq('id', existing.id).select().single()
        if (error) throw error
        card = data as ReportCard
      } else {
        const { data, error } = await supabase
          .from('report_cards').insert(payload).select().single()
        if (error) throw error
        card = data as ReportCard
      }

      if (input.publish) {
        const { data: parents } = await supabase
          .from('parent_child_links').select('parent_id').eq('child_id', input.childId)
        if (parents && parents.length > 0) {
          await supabase.from('notifications').insert(
            parents.map((p: any) => ({
              user_id: p.parent_id,
              school_id: input.schoolId,
              type: 'report_card_published',
              title: 'Report Card Published',
              body: `${input.period} report card is now available.`,
              data: { child_id: input.childId, report_card_id: card.id },
              is_read: false,
            }))
          )
        }
      }
      return card
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['report-cards', 'child', data.child_id] })
    },
  })
}
