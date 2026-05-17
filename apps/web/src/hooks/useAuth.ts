import { useAuthStore } from '@store/auth.store'
import type { UserRole } from '@/types/database'

export function useAuth() {
  const store = useAuthStore()
  return {
    session: store.session,
    profile: store.profile,
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
    isAuthenticated: store.isAuthenticated(),
    role: store.role() as UserRole | null,
    schoolId: store.schoolId(),
    userId: store.userId(),
    signOut: store.signOut,
    refreshProfile: store.refreshProfile,
  }
}
