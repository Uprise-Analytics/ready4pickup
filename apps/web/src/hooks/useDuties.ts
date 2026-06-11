'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '@lib/supabase'
import { queryKeys } from '@lib/query-client'
import type { DutyLocation, DutyAssignment, DutyAssignmentWithDetails } from '@/types/database'

const today = () => format(new Date(), 'yyyy-MM-dd')

// ── Teacher: upcoming + today duties ─────────────────────────────────────────

export function useMyDuties(teacherId: string | null) {
  return useQuery({
    queryKey: queryKeys.duties.myDuties(teacherId ?? ''),
    enabled: !!teacherId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duty_assignments')
        .select('*, location:duty_locations(id, name)')
        .eq('teacher_id', teacherId!)
        .gte('duty_date', today())
        .order('duty_date')
        .order('start_time')
      if (error) throw error
      return (data ?? []) as DutyAssignmentWithDetails[]
    },
  })
}

export function useTodaysDuties(teacherId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.duties.myDuties(teacherId ?? ''), 'today'],
    enabled: !!teacherId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duty_assignments')
        .select('*, location:duty_locations(id, name)')
        .eq('teacher_id', teacherId!)
        .eq('duty_date', today())
        .order('start_time')
      if (error) throw error
      return (data ?? []) as DutyAssignmentWithDetails[]
    },
  })
}

// ── Admin: locations ──────────────────────────────────────────────────────────

export function useDutyLocations(schoolId: string | null) {
  return useQuery({
    queryKey: queryKeys.duties.locations(schoolId ?? ''),
    enabled: !!schoolId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duty_locations')
        .select('*')
        .eq('school_id', schoolId!)
        .order('name')
      if (error) throw error
      return (data ?? []) as DutyLocation[]
    },
  })
}

export function useCreateDutyLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { schoolId: string; name: string; description?: string; createdBy: string }) => {
      const { data, error } = await supabase
        .from('duty_locations')
        .insert({
          school_id: input.schoolId,
          name: input.name,
          description: input.description ?? null,
          created_by: input.createdBy,
        })
        .select()
        .single()
      if (error) throw error
      return data as DutyLocation
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.duties.locations(vars.schoolId) })
    },
  })
}

export function useUpdateDutyLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; schoolId: string; name: string; description?: string; isActive?: boolean }) => {
      const { error } = await supabase
        .from('duty_locations')
        .update({
          name: input.name,
          description: input.description ?? null,
          ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
        })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.duties.locations(vars.schoolId) })
    },
  })
}

export function useDeleteDutyLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; schoolId: string }) => {
      const { error } = await supabase
        .from('duty_locations')
        .update({ is_active: false })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.duties.locations(vars.schoolId) })
    },
  })
}

// ── Admin: assignments ────────────────────────────────────────────────────────

export function useDutyAssignments(schoolId: string | null) {
  return useQuery({
    queryKey: queryKeys.duties.assignments(schoolId ?? ''),
    enabled: !!schoolId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duty_assignments')
        .select('*, location:duty_locations(id, name), teacher:profiles!teacher_id(id, full_name, email)')
        .eq('school_id', schoolId!)
        .order('duty_date')
        .order('start_time')
      if (error) throw error
      return (data ?? []) as DutyAssignmentWithDetails[]
    },
  })
}

export function useCreateDutyAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      schoolId: string
      teacherId: string
      locationId: string
      dutyDate: string
      startTime: string
      endTime: string
      notes?: string
      createdBy: string
    }) => {
      const { data, error } = await supabase
        .from('duty_assignments')
        .insert({
          school_id: input.schoolId,
          teacher_id: input.teacherId,
          location_id: input.locationId,
          duty_date: input.dutyDate,
          start_time: input.startTime,
          end_time: input.endTime,
          notes: input.notes ?? null,
          created_by: input.createdBy,
        })
        .select()
        .single()
      if (error) throw error
      return data as DutyAssignment
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.duties.assignments(vars.schoolId) })
      qc.invalidateQueries({ queryKey: queryKeys.duties.myDuties(vars.teacherId) })
    },
  })
}

export function useUpdateDutyAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      schoolId: string
      teacherId: string
      locationId?: string
      dutyDate?: string
      startTime?: string
      endTime?: string
      notes?: string | null
    }) => {
      const { error } = await supabase
        .from('duty_assignments')
        .update({
          ...(input.locationId !== undefined ? { location_id: input.locationId } : {}),
          ...(input.dutyDate !== undefined ? { duty_date: input.dutyDate } : {}),
          ...(input.startTime !== undefined ? { start_time: input.startTime } : {}),
          ...(input.endTime !== undefined ? { end_time: input.endTime } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.duties.assignments(vars.schoolId) })
      qc.invalidateQueries({ queryKey: queryKeys.duties.myDuties(vars.teacherId) })
    },
  })
}

export function useDeleteDutyAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; schoolId: string; teacherId: string }) => {
      const { error } = await supabase.from('duty_assignments').delete().eq('id', input.id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.duties.assignments(vars.schoolId) })
      qc.invalidateQueries({ queryKey: queryKeys.duties.myDuties(vars.teacherId) })
    },
  })
}

// ── Admin: school teachers (for picker) ──────────────────────────────────────

export function useSchoolTeachers(schoolId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.profiles.school(schoolId ?? ''), 'teachers'],
    enabled: !!schoolId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('school_id', schoolId!)
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('full_name')
      if (error) throw error
      return (data ?? []) as { id: string; full_name: string; email: string }[]
    },
  })
}
