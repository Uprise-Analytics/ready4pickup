﻿'use client'

import React, { useEffect } from 'react'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from '@lib/supabase'
import { useAuthStore } from '@store/auth.store'
import { queryClient } from '@lib/query-client'
import type { Profile, UserRole } from '@/types/database'

const profileFromSession = (user: User): Profile | null => {
  const m = user.user_metadata
  if (!m?.role) return null
  return {
    id: user.id,
    email: user.email ?? '',
    full_name: m.full_name ?? '',
    avatar_url: m.avatar_url ?? null,
    phone: m.phone ?? null,
    role: m.role as UserRole,
    school_id: m.school_id ?? null,
    is_active: m.is_active ?? true,
    push_token: null,
    notification_prefs: m.notification_prefs ?? {
      on_way: true, preparing: true, picked_up: true, announcements: true, blocked_alert: true,
    },
    created_at: '',
    updated_at: '',
  }
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setSession, setProfile, setLoading, setInitialized } = useAuthStore()

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10_000)),
      ])
      if (error) { console.warn('[AuthProvider] Could not fetch profile:', error.message); return null }
      return data as Profile
    } catch {
      console.warn('[AuthProvider] fetchProfile timed out')
      return null
    }
  }

  useEffect(() => {
    let done = false

    const timeoutId = setTimeout(() => {
      if (!done) {
        done = true
        console.warn('[AuthProvider] Init timeout -- forcing initialized state')
        setSession(null); setProfile(null); setLoading(false); setInitialized(true)
      }
    }, 12_000)

    const initialize = async (session: Session | null) => {
      if (done) return
      done = true
      clearTimeout(timeoutId)
      setSession(session)

      if (session?.user) {
        const jwtProfile = profileFromSession(session.user)
        if (jwtProfile) {
          setProfile(jwtProfile); setLoading(false); setInitialized(true)
          queryClient.invalidateQueries()
          // JWT metadata may lack avatar_url — fetch the real DB profile in the background
          fetchProfile(session.user.id).then(p => { if (p) setProfile(p) })
        } else {
          const profile = await fetchProfile(session.user.id)
          if (!profile) {
            supabase.auth.signOut().catch(() => {})
            setSession(null); setProfile(null); setLoading(false); setInitialized(true)
            return
          }
          setProfile(profile); setLoading(false); setInitialized(true)
          queryClient.invalidateQueries()
        }
      } else {
        setProfile(null); setLoading(false); setInitialized(true)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        switch (event) {
          case 'INITIAL_SESSION':
            await initialize(session)
            break

          case 'SIGNED_IN':
            if (session?.user) {
              setSession(session); setLoading(true)
              await Promise.resolve()
              const jwtProfile = profileFromSession(session.user)
              if (jwtProfile) {
                setProfile(jwtProfile); setLoading(false); setInitialized(true)
                queryClient.invalidateQueries()
                fetchProfile(session.user.id).then(p => { if (p) setProfile(p) })
              } else {
                const profile = await fetchProfile(session.user.id)
                if (!profile) {
                  supabase.auth.signOut().catch(() => {})
                  setSession(null); setProfile(null); setLoading(false); setInitialized(true)
                  return
                }
                setProfile(profile); setLoading(false); setInitialized(true)
                queryClient.invalidateQueries()
              }
            }
            break

          case 'TOKEN_REFRESHED':
            if (session?.user) {
              const jwtProfile = profileFromSession(session.user)
              if (jwtProfile) {
                setProfile(jwtProfile); queryClient.invalidateQueries()
                fetchProfile(session.user.id).then(p => { if (p) setProfile(p) })
              } else {
                const profile = await fetchProfile(session.user.id)
                if (!profile) {
                  supabase.auth.signOut().catch(() => {})
                  setSession(null); setProfile(null); setLoading(false); setInitialized(true)
                } else {
                  setProfile(profile); queryClient.invalidateQueries()
                }
              }
            }
            break

          case 'SIGNED_OUT':
            setSession(null); setProfile(null); setLoading(false); setInitialized(true)
            break

          case 'USER_UPDATED':
            if (session?.user) {
              const profile = await fetchProfile(session.user.id)
              if (profile) setProfile(profile)
            }
            break
        }
      }
    )

    supabase.auth.getSession().then(({ data: { session } }) => initialize(session))

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [])

  // Resume token auto-refresh on tab visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.startAutoRefresh()
      } else {
        supabase.auth.stopAutoRefresh()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return <>{children}</>
}
