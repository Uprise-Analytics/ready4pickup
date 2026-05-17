import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db, supabase } from '@lib/supabase'
import { queryKeys } from '@lib/query-client'
import type {
  Child, Classroom, Profile, TeacherClassroomAssignment,
  IncidentReport, IncidentSeverity, IncidentCategory,
} from '@/types/database'

// -------------------------------------------------------
// School stats
// -------------------------------------------------------

export function useSchoolStats(schoolId: string | null) {
  return useQuery({
    queryKey: ['school-admin', 'stats', schoolId ?? ''],
    enabled: !!schoolId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const [childrenRes, profilesRes, checkinsRes, pickupsRes] = await Promise.all([
        db.children().select('id, is_active').eq('school_id', schoolId!).is('deleted_at', null),
        db.profiles().select('id, role, is_active').eq('school_id', schoolId!),
        db.childCheckins().select('id, status').eq('school_id', schoolId!).eq('date', today),
        db.pickupRequests().select('id').eq('school_id', schoolId!).in('status', ['on_the_way', 'arrived', 'preparing']),
      ])
      const children = childrenRes.data ?? []
      const profiles = profilesRes.data ?? []
      const checkins = checkinsRes.data ?? []
      const pickups  = pickupsRes.data ?? []
      return {
        totalChildren: children.filter((c) => c.is_active).length,
        checkedInToday: checkins.filter((c) => c.status === 'present').length,
        pickedUpToday: checkins.filter((c) => c.status === 'picked_up').length,
        livePickups: pickups.length,
        totalStaff: profiles.filter((p) => p.role !== 'platform_owner').length,
        teachers: profiles.filter((p) => p.role === 'teacher').length,
        parents: profiles.filter((p) => p.role === 'parent').length,
        collectors: profiles.filter((p) => p.role === 'collector').length,
      }
    },
  })
}

// -------------------------------------------------------
// Children
// -------------------------------------------------------

export function useSchoolChildren(schoolId: string | null) {
  return useQuery({
    queryKey: queryKeys.children.school(schoolId ?? ''),
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await db.children()
        .select('*')
        .eq('school_id', schoolId!)
        .is('deleted_at', null)
        .order('first_name')
      if (error) throw error
      return data as Child[]
    },
  })
}

export function useAddChild() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      schoolId: string; createdBy: string; studentId: string
      firstName: string; lastName: string; classroom: string | null
      classroomId: string | null; grade: string | null; dateOfBirth: string | null
      allergies: string[]; medicalNotes: string | null; wearsDiapers: boolean; drinksBottle: boolean
    }) => {
      const { data, error } = await db.children()
        .insert({
          school_id: input.schoolId, created_by: input.createdBy, student_id: input.studentId,
          first_name: input.firstName, last_name: input.lastName, classroom: input.classroom,
          classroom_id: input.classroomId, grade: input.grade, date_of_birth: input.dateOfBirth,
          allergies: input.allergies, medical_notes: input.medicalNotes, is_active: true,
          wears_diapers: input.wearsDiapers, drinks_bottle: input.drinksBottle, emergency_contacts: [],
        })
        .select().single()
      if (error) throw error
      return data as Child
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.children.school(data.school_id) })
    },
  })
}

export function useUpdateChild() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string; schoolId: string; firstName?: string; lastName?: string
      classroom?: string | null; classroomId?: string | null; grade?: string | null
      allergies?: string[]; medicalNotes?: string | null; isActive?: boolean
      wearsDiapers?: boolean; drinksBottle?: boolean
    }) => {
      const { id, schoolId, firstName, lastName, classroom, classroomId, grade, allergies, medicalNotes, isActive, wearsDiapers, drinksBottle } = input
      const updates: Record<string, unknown> = {}
      if (firstName !== undefined) updates.first_name = firstName
      if (lastName !== undefined) updates.last_name = lastName
      if (classroom !== undefined) updates.classroom = classroom
      if (classroomId !== undefined) updates.classroom_id = classroomId
      if (grade !== undefined) updates.grade = grade
      if (allergies !== undefined) updates.allergies = allergies
      if (medicalNotes !== undefined) updates.medical_notes = medicalNotes
      if (isActive !== undefined) updates.is_active = isActive
      if (wearsDiapers !== undefined) updates.wears_diapers = wearsDiapers
      if (drinksBottle !== undefined) updates.drinks_bottle = drinksBottle

      const { data, error } = await db.children().update(updates).eq('id', id).select().single()
      if (error) throw error
      return { data: data as Child, schoolId }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['children'] })
    },
  })
}

// -------------------------------------------------------
// Classrooms
// -------------------------------------------------------

export function useSchoolClassrooms(schoolId: string | null) {
  return useQuery({
    queryKey: ['classrooms', 'school', schoolId ?? ''],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await db.classrooms()
        .select('*')
        .eq('school_id', schoolId!)
        .order('name')
      if (error) throw error
      return data as Classroom[]
    },
  })
}

export function useCreateClassroom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      schoolId: string; createdBy: string; name: string
      isBabyClass: boolean; color: string; capacity?: number
    }) => {
      const { data, error } = await db.classrooms()
        .insert({
          school_id: input.schoolId, created_by: input.createdBy, name: input.name,
          is_baby_class: input.isBabyClass, color: input.color,
          capacity: input.capacity ?? null, is_active: true,
        })
        .select().single()
      if (error) throw error
      return data as Classroom
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['classrooms', 'school', data.school_id] })
    },
  })
}

export function useUpdateClassroom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string; schoolId: string; name?: string
      isBabyClass?: boolean; color?: string; isActive?: boolean
    }) => {
      const { id, schoolId, isBabyClass, isActive, ...rest } = input
      const updates: Record<string, unknown> = { ...rest }
      if (isBabyClass !== undefined) updates.is_baby_class = isBabyClass
      if (isActive !== undefined) updates.is_active = isActive
      const { data, error } = await db.classrooms().update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Classroom
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['classrooms', 'school', data.school_id] })
    },
  })
}

// -------------------------------------------------------
// Teacher assignments
// -------------------------------------------------------

export type TeacherAssignmentWithDetails = TeacherClassroomAssignment & {
  teacher: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  classroom: Pick<Classroom, 'id' | 'name' | 'color' | 'is_baby_class'>
}

export function useTeacherAssignments(schoolId: string | null) {
  return useQuery({
    queryKey: ['teacher-assignments', 'school', schoolId ?? ''],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await db.teacherClassroomAssignments()
        .select('*, teacher:profiles!teacher_id(id, full_name, avatar_url), classroom:classrooms(id, name, color, is_baby_class)')
        .eq('school_id', schoolId!)
        .eq('is_active', true)
      if (error) throw error
      return data as TeacherAssignmentWithDetails[]
    },
  })
}

export function useAssignTeacherToClassroom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { teacherId: string; classroomId: string; schoolId: string }) => {
      await db.teacherClassroomAssignments()
        .update({ is_active: false })
        .eq('teacher_id', input.teacherId)
        .eq('school_id', input.schoolId)

      const { data, error } = await db.teacherClassroomAssignments()
        .insert({ teacher_id: input.teacherId, classroom_id: input.classroomId, school_id: input.schoolId, is_active: true })
        .select().single()
      if (error) throw error
      return data as TeacherClassroomAssignment
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['teacher-assignments', 'school', data.school_id] })
    },
  })
}

export function useSetTeacherCheckoutPermission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { teacherId: string; schoolId: string; canCheckout: boolean; grantedBy: string }) => {
      const { error } = await supabase
        .from('teacher_permissions')
        .upsert({ teacher_id: input.teacherId, school_id: input.schoolId, can_checkout: input.canCheckout, granted_by: input.grantedBy })
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['teacher-permissions', 'school', variables.schoolId] })
    },
  })
}

// -------------------------------------------------------
// Incident reports
// -------------------------------------------------------

export type IncidentWithDetails = IncidentReport & {
  reporter: { id: string; full_name: string } | null
  child: { id: string; first_name: string; last_name: string } | null
}

export function useSchoolIncidents(schoolId: string | null) {
  return useQuery({
    queryKey: ['incidents', 'school', schoolId ?? ''],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_reports')
        .select(`*, reporter:reported_by(id, full_name), child:child_id(id, first_name, last_name)`)
        .eq('school_id', schoolId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as IncidentWithDetails[]
    },
  })
}

export function useAllIncidents() {
  return useQuery({
    queryKey: ['incidents', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_reports')
        .select(`*, reporter:reported_by(id, full_name), child:child_id(id, first_name, last_name)`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as IncidentWithDetails[]
    },
  })
}

export function useReportIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      schoolId: string; reportedBy: string; title: string; description: string
      category: IncidentCategory; severity: IncidentSeverity; childId: string | null
      location: string | null; witnesses: string | null; actionTaken: string | null
      followUpRequired: boolean; occurredAt: string
    }) => {
      const { data, error } = await supabase
        .from('incident_reports')
        .insert({
          school_id: input.schoolId, reported_by: input.reportedBy, title: input.title,
          description: input.description, category: input.category, severity: input.severity,
          child_id: input.childId, location: input.location, witnesses: input.witnesses,
          action_taken: input.actionTaken, follow_up_required: input.followUpRequired,
          occurred_at: input.occurredAt,
        })
        .select().single()
      if (error) throw error
      return { data: data as IncidentReport, input }
    },
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ['incidents', 'school', data.school_id] })
      qc.invalidateQueries({ queryKey: ['incidents', 'all'] })
      supabase.functions
        .invoke('notify-incident', { body: { incidentId: data.id, schoolId: data.school_id, title: data.title } })
        .catch(() => {})
    },
  })
}

export function useResolveIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, schoolId, resolvedBy }: { id: string; schoolId: string; resolvedBy: string }) => {
      const { data, error } = await supabase
        .from('incident_reports')
        .update({ is_resolved: true, resolved_at: new Date().toISOString(), resolved_by: resolvedBy })
        .eq('id', id).select().single()
      if (error) throw error
      return data as IncidentReport
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['incidents', 'school', data.school_id] })
      qc.invalidateQueries({ queryKey: ['incidents', 'all'] })
    },
  })
}

// -------------------------------------------------------
// Announcements
// -------------------------------------------------------

import type { Announcement, AnnouncementAudience } from '@/types/database'

export function useSchoolAnnouncements(schoolId: string | null) {
  return useQuery({
    queryKey: ['announcements', 'school', schoolId ?? ''],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await db.announcements()
        .select('*')
        .eq('school_id', schoolId!)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Announcement[]
    },
  })
}

export function useCreateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      schoolId: string
      createdBy: string
      title: string
      body: string
      publish: boolean
      targetAudience: AnnouncementAudience
      targetClassroomIds: string[]
      expiresAt: string | null
    }) => {
      const now = new Date().toISOString()
      const { data, error } = await db.announcements()
        .insert({
          school_id: input.schoolId,
          created_by: input.createdBy,
          title: input.title,
          body: input.body,
          is_published: input.publish,
          published_at: input.publish ? now : null,
          expires_at: input.expiresAt,
          target_audience: input.targetAudience,
          target_classroom_ids: input.targetClassroomIds.length > 0 ? input.targetClassroomIds : null,
        })
        .select().single()
      if (error) throw error
      const ann = data as Announcement
      if (input.publish) {
        supabase.functions
          .invoke('notify-announcement', { body: { announcementId: ann.id, schoolId: ann.school_id } })
          .catch(() => {})
      }
      return ann
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['announcements', 'school', data.school_id] })
    },
  })
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      schoolId: string
      title: string
      body: string
      targetAudience: AnnouncementAudience
      targetClassroomIds: string[]
      expiresAt: string | null
    }) => {
      const { data, error } = await db.announcements()
        .update({
          title: input.title,
          body: input.body,
          target_audience: input.targetAudience,
          target_classroom_ids: input.targetClassroomIds.length > 0 ? input.targetClassroomIds : null,
          expires_at: input.expiresAt,
        })
        .eq('id', input.id)
        .select().single()
      if (error) throw error
      return data as Announcement
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['announcements', 'school', data.school_id] })
    },
  })
}

export function useToggleAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { data, error } = await db.announcements()
        .update({ is_published: publish, published_at: publish ? new Date().toISOString() : null })
        .eq('id', id).select().single()
      if (error) throw error
      const ann = data as Announcement
      if (publish) {
        supabase.functions
          .invoke('notify-announcement', { body: { announcementId: ann.id, schoolId: ann.school_id } })
          .catch(() => {})
      }
      return ann
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['announcements', 'school', data.school_id] })
    },
  })
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, schoolId }: { id: string; schoolId: string }) => {
      const { error } = await db.announcements().delete().eq('id', id)
      if (error) throw error
      return schoolId
    },
    onSuccess: (schoolId) => {
      qc.invalidateQueries({ queryKey: ['announcements', 'school', schoolId] })
    },
  })
}

// -------------------------------------------------------
// Realtime subscriptions
// -------------------------------------------------------

export function useIncidentsRealtime(schoolId: string | null) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!schoolId) return
    const channelName = `incidents:${schoolId}`
    const stale = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`)
    if (stale) supabase.removeChannel(stale)
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_reports', filter: `school_id=eq.${schoolId}` }, () => {
        qc.invalidateQueries({ queryKey: ['incidents', 'school', schoolId] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [schoolId, qc])
}

export function useAllIncidentsRealtime() {
  const qc = useQueryClient()
  useEffect(() => {
    const channelName = `incidents:all`
    const stale = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`)
    if (stale) supabase.removeChannel(stale)
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_reports' }, () => {
        qc.invalidateQueries({ queryKey: ['incidents', 'all'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [qc])
}
