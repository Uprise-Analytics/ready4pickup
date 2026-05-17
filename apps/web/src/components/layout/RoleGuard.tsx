'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@store/auth.store'

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isInitialized, session, profile } = useAuthStore()

  useEffect(() => {
    if (!isInitialized) return
    if (!session) { router.replace('/login'); return }
    if (profile && profile.role !== 'school_admin' && profile.role !== 'platform_owner') {
      router.replace('/login')
    }
  }, [isInitialized, session, profile, router])

  // Only show spinner on cold load — if profile is already in the persisted store, render immediately
  if (!isInitialized && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  if (!session || !profile) return null

  if (profile.role !== 'school_admin' && profile.role !== 'platform_owner') return null

  return <>{children}</>
}
