'use client'

import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@lib/query-client'
import { AuthProvider } from '@features/auth/AuthProvider'
import { Toaster } from 'sonner'
import { useThemeStore } from '@store/theme.store'

function ThemeWatcher() {
  const accent = useThemeStore((s) => s.accent)
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent)
  }, [accent])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeWatcher />
        {children}
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  )
}
