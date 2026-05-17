import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@lib/supabase'
import { queryClient } from '@lib/query-client'
import type { Profile, UserRole } from '@/types/database'

interface AuthState {
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean
  previewRole: UserRole | null
  _originalSchoolId: string | null
}

interface AuthActions {
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  setPreviewMode: (role: UserRole, schoolId: string) => void
  clearPreviewMode: () => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  isAuthenticated: () => boolean
  role: () => UserRole | null
  schoolId: () => string | null
  userId: () => string | null
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      session: null,
      profile: null,
      isLoading: false,
      isInitialized: false,
      previewRole: null,
      _originalSchoolId: null,

      setSession: (session) => set({ session }),
      setProfile: (profile) => set((state) => {
        if (state.previewRole && profile && state.profile?.school_id) {
          return { profile: { ...profile, school_id: state.profile.school_id } }
        }
        return { profile }
      }),
      setLoading: (isLoading) => set({ isLoading }),
      setInitialized: (isInitialized) => set({ isInitialized }),
      setPreviewMode: (role, schoolId) => {
        set((state) => ({
          previewRole: role,
          _originalSchoolId: state.profile?.school_id ?? null,
          profile: state.profile ? { ...state.profile, school_id: schoolId } : null,
        }))
        queryClient.invalidateQueries()
      },
      clearPreviewMode: () => {
        set((state) => ({
          previewRole: null,
          _originalSchoolId: null,
          profile: state.profile ? { ...state.profile, school_id: state._originalSchoolId } : null,
        }))
        queryClient.invalidateQueries()
      },

      signOut: async () => {
        set({ session: null, profile: null, previewRole: null, _originalSchoolId: null })
        queryClient.clear()
        supabase.auth.signOut().catch(() => {})
      },

      refreshProfile: async () => {
        const uid = get().session?.user?.id
        if (!uid) return
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .single()
        if (!error && data) set({ profile: data as Profile })
      },

      isAuthenticated: () => !!get().session?.user,
      role: () => get().profile?.role ?? null,
      schoolId: () => get().profile?.school_id ?? null,
      userId: () => get().session?.user?.id ?? null,
    }),
    {
      name: 'ready4pickup-admin-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
        profile: state.profile,
      }),
    }
  )
)
