import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'
import { db, supabase, supabaseUrl, supabaseAnonKey } from '@lib/supabase'
import { queryKeys } from '@lib/query-client'
import { useAuthStore } from '@store/auth.store'
import type { School, Profile, UserRole } from '@/types/database'

// -------------------------------------------------------
// Queries
// -------------------------------------------------------

export function useAllSchools() {
  const role = useAuthStore((s) => s.profile?.role)
  return useQuery({
    queryKey: queryKeys.schools.all,
    enabled: role === 'platform_owner',
    queryFn: async () => {
      const { data, error } = await db.schools()
        .select('*')
        .order('name')
      if (error) throw error
      return data as School[]
    },
  })
}

export function useSchoolDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.schools.detail(id),
    queryFn: async () => {
      const { data, error } = await db.schools()
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as School
    },
    enabled: !!id,
  })
}

export function useAllUsers(filters?: { role?: UserRole; schoolId?: string }) {
  const role = useAuthStore((s) => s.profile?.role)
  return useQuery({
    queryKey: queryKeys.admin.users(filters),
    enabled: role === 'platform_owner' || role === 'school_admin',
    queryFn: async () => {
      let query = db.profiles().select('*').order('created_at', { ascending: false })
      if (filters?.role) query = query.eq('role', filters.role)
      if (filters?.schoolId) query = query.eq('school_id', filters.schoolId)
      const { data, error } = await query
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useUserDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.profiles.detail(id),
    queryFn: async () => {
      const { data, error } = await db.profiles()
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!id,
  })
}

export function usePlatformStats() {
  const role = useAuthStore((s) => s.profile?.role)
  return useQuery({
    queryKey: queryKeys.admin.stats,
    enabled: role === 'platform_owner',
    queryFn: async () => {
      const [schoolsRes, profilesRes, pickupsRes] = await Promise.all([
        db.schools().select('id, is_active'),
        db.profiles().select('id, role, is_active'),
        db.pickupRequests().select('id').in('status', ['on_the_way', 'arrived', 'preparing']),
      ])
      if (schoolsRes.error) throw schoolsRes.error

      const schools = schoolsRes.data ?? []
      const profiles = profilesRes.data ?? []
      const pickups  = pickupsRes.data ?? []

      return {
        totalSchools: schools.length,
        activeSchools: schools.filter((s) => s.is_active).length,
        totalUsers: profiles.length,
        admins: profiles.filter((p) => p.role === 'school_admin').length,
        teachers: profiles.filter((p) => p.role === 'teacher').length,
        parents: profiles.filter((p) => p.role === 'parent').length,
        collectors: profiles.filter((p) => p.role === 'collector').length,
        activePickupsToday: pickups.length,
      }
    },
    staleTime: 60 * 1000,
  })
}

// -------------------------------------------------------
// Mutations
// -------------------------------------------------------

export function useCreateSchool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      slug: string
      address?: string
      phone?: string
      email?: string
      timezone?: string
    }) => {
      const { data, error } = await db.schools()
        .insert({
          name: input.name,
          slug: input.slug.toLowerCase().replace(/\s+/g, '-'),
          address: input.address ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
          timezone: input.timezone ?? 'UTC',
          primary_color: '#2563EB',
          secondary_color: '#7C3AED',
        })
        .select()
        .single()
      if (error) throw error
      return data as School
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.schools.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats })
    },
  })
}

export function useDeleteSchool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.schools().delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.schools.all })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats })
    },
  })
}

export function useUpdateSchool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      name?: string
      address?: string
      phone?: string
      email?: string
      is_active?: boolean
    }) => {
      const { id, ...updates } = input
      const { data, error } = await db.schools()
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as School
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.schools.all })
      qc.invalidateQueries({ queryKey: queryKeys.schools.detail(data.id) })
    },
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { userId: string; role: UserRole; schoolId: string | null }) => {
      const { data, error } = await db.profiles()
        .update({ role: input.role, school_id: input.schoolId })
        .eq('id', input.userId)
        .select()
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.users() })
      qc.invalidateQueries({ queryKey: queryKeys.profiles.detail(data.id) })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats })
    },
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await db.profiles()
        .update({ is_active: isActive })
        .eq('id', userId)
      if (error) throw error
      return { id: userId }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.users() })
      qc.invalidateQueries({ queryKey: queryKeys.profiles.detail(data.id) })
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke('delete-user', { body: { userId } })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.users() })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats })
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      fullName?: string
      phone?: string | null
      role?: UserRole
      schoolId?: string | null
      isActive?: boolean
    }) => {
      const { userId, fullName, phone, role, schoolId, isActive } = input
      const updates: Record<string, unknown> = {}
      if (fullName !== undefined) { updates.full_name = fullName; updates.email = undefined }
      if (phone !== undefined) updates.phone = phone
      if (role !== undefined) updates.role = role
      if (schoolId !== undefined) updates.school_id = schoolId
      if (isActive !== undefined) updates.is_active = isActive

      const { data, error } = await db.profiles()
        .update(updates)
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.users() })
      qc.invalidateQueries({ queryKey: queryKeys.profiles.detail(data.id) })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats })
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      fullName: string
      email: string
      password: string
      role: UserRole
      schoolId: string | null
    }) => {
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { full_name: input.fullName, role: input.role, phone: null } },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('User creation failed')

      const profileClient = authData.session ? tempClient : supabase
      const { error: profileError } = await profileClient.from('profiles').upsert({
        id:        authData.user.id,
        email:     input.email,
        full_name: input.fullName,
        role:      input.role,
        school_id: input.schoolId,
        is_active: true,
      })
      if (profileError) throw profileError
      return { id: authData.user.id, email: input.email, full_name: input.fullName, role: input.role, school_id: input.schoolId, is_active: true } as unknown as Profile
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.users() })
      qc.invalidateQueries({ queryKey: queryKeys.admin.stats })
    },
  })
}
