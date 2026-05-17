'use client'

import { useAuthStore } from '@store/auth.store'
import { useSchoolDetail } from '@hooks/useAdmin'
import { getInitials, getAvatarColor } from '@utils/format'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import { LogOut, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function TopBar() {
  const { profile, signOut } = useAuthStore()
  const { data: school } = useSchoolDetail(profile?.school_id ?? '')
  const router = useRouter()

  if (!profile) return null

  const schoolName = profile.role === 'platform_owner'
    ? 'Ready4Pickup Platform'
    : school?.name ?? 'Loading...'

  const initials = getInitials(profile.full_name)
  const avatarColor = getAvatarColor(profile.full_name)

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
      <div>
        <p className="text-base font-semibold text-slate-900">{schoolName}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50 transition-colors focus:outline-none">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">{profile.full_name}</p>
              <p className="text-xs text-slate-400">{profile.email}</p>
            </div>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {initials}
              </div>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-slate-800 truncate">{profile.full_name}</p>
            <p className="text-xs text-slate-400 truncate">{profile.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings')}>
            <Settings size={14} className="mr-2 text-slate-500" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
            onClick={() => signOut()}
          >
            <LogOut size={14} className="mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
