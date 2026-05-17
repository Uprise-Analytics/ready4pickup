'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@store/auth.store'
import { useThemeStore } from '@store/theme.store'
import { getInitials, getAvatarColor } from '@utils/format'
import {
  LayoutDashboard, Truck, AlertTriangle, Users, Baby,
  History, School, UserCog, Megaphone,
} from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  school_admin: 'School Admin',
  platform_owner: 'Platform Owner',
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',     label: 'Dashboard',      icon: <LayoutDashboard size={18} />, roles: ['school_admin', 'platform_owner'] },
  { href: '/pickups',       label: 'Live Pickups',   icon: <Truck size={18} />,           roles: ['school_admin', 'platform_owner'] },
  { href: '/incidents',     label: 'Incidents',      icon: <AlertTriangle size={18} />,   roles: ['school_admin', 'platform_owner'] },
  { href: '/people',        label: 'People',         icon: <Users size={18} />,           roles: ['school_admin'] },
  { href: '/children',      label: 'Children',       icon: <Baby size={18} />,            roles: ['school_admin'] },
  { href: '/history',       label: 'Pickup History', icon: <History size={18} />,         roles: ['school_admin'] },
  { href: '/announcements', label: 'Announcements',  icon: <Megaphone size={18} />,       roles: ['school_admin'] },
  { href: '/schools',       label: 'Schools',        icon: <School size={18} />,          roles: ['platform_owner'] },
  { href: '/users',         label: 'All Users',      icon: <UserCog size={18} />,         roles: ['platform_owner'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile } = useAuthStore()
  const accent = useThemeStore((s) => s.getAccentOption())

  if (!profile) return null

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(profile.role))
  const initials = getInitials(profile.full_name)
  const avatarColor = getAvatarColor(profile.full_name)

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Ready4Pickup"
            className="w-9 h-9 rounded-lg object-contain flex-shrink-0"
          />
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">Ready4Pickup</p>
            <p className="text-xs text-slate-400 mt-0.5">Admin Console</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? accent.classes.nav
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={isActive ? accent.classes.icon : 'text-slate-400'}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{profile.full_name}</p>
            <p className="text-xs text-slate-400">{ROLE_LABELS[profile.role] ?? profile.role}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
