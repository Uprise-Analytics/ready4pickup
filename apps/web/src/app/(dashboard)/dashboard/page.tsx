'use client'

import { useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@store/auth.store'
import { useSchoolStats } from '@hooks/useSchoolAdmin'
import { usePlatformStats, useAllSchools, useAllUsers, useStaffCertificates } from '@hooks/useAdmin'
import { StatCard } from '@components/dashboard/StatCard'
import { Badge } from '@components/ui/badge'
import { formatRelativeTime } from '@utils/format'
import { getCertStatus } from '@/types/database'
import {
  Baby, Users, Truck, AlertTriangle, School,
  UserCheck, LogIn, UserCog, ShieldCheck,
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const profile = useAuthStore((s) => s.profile)

  useEffect(() => {
    if (profile?.role === 'teacher') router.replace('/teacher')
  }, [profile, router])

  if (!profile) return null
  if (profile.role === 'teacher') return null
  return profile.role === 'platform_owner'
    ? <PlatformDashboard />
    : <SchoolDashboard schoolId={profile.school_id ?? ''} />
}

// ─── School Admin Dashboard ───────────────────────────────────────────────────

function SchoolDashboard({ schoolId }: { schoolId: string }) {
  const router = useRouter()
  const { data, isLoading } = useSchoolStats(schoolId)
  const { data: certs = [] } = useStaffCertificates(schoolId)

  const expired = certs.filter(c => getCertStatus(c.expiry_date) === 'expired')
  const expiringSoon = certs.filter(c => getCertStatus(c.expiry_date) === 'expiring_soon')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Today&apos;s overview for your school</p>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Children"   value={data?.totalChildren}   icon={Baby}      color="blue"   isLoading={isLoading} />
        <StatCard label="Checked In Today" value={data?.checkedInToday}  icon={LogIn}     color="green"  isLoading={isLoading} />
        <StatCard label="Picked Up Today"  value={data?.pickedUpToday}   icon={UserCheck} color="purple" isLoading={isLoading} />
        <StatCard label="Live Pickups"     value={data?.livePickups}     icon={Truck}     color="amber"  isLoading={isLoading} />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Total Staff"  value={data?.totalStaff}  icon={Users}   color="slate" isLoading={isLoading} />
        <StatCard label="Teachers"     value={data?.teachers}    icon={UserCog} color="blue"  isLoading={isLoading} />
        <StatCard label="Parents"      value={data?.parents}     icon={Users}   color="green" isLoading={isLoading} />
      </div>

      {expired.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-red-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-800">
              {expired.length} expired certificate{expired.length !== 1 ? 's' : ''} — action required
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {expired.map(c => (
              <button
                key={c.id}
                onClick={() => router.push('/staff-certificates')}
                className="px-2.5 py-1 rounded-md bg-red-100 border border-red-300 text-xs font-medium text-red-800 hover:bg-red-200 transition-colors"
              >
                {c.staff.full_name} · {c.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {expiringSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              {expiringSoon.length} certificate{expiringSoon.length !== 1 ? 's' : ''} expiring within 60 days
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {expiringSoon.map(c => (
              <button
                key={c.id}
                onClick={() => router.push('/staff-certificates')}
                className="px-2.5 py-1 rounded-md bg-amber-100 border border-amber-300 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors"
              >
                {c.staff.full_name} · {c.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Platform Owner Dashboard ─────────────────────────────────────────────────

function PlatformDashboard() {
  const router = useRouter()
  const { data: stats, isLoading: statsLoading } = usePlatformStats()
  const { data: schools = [] } = useAllSchools()
  const { data: allUsers = [] } = useAllUsers()

  const schoolsNeedingAdmin = useMemo(() => {
    const adminSchoolIds = new Set(
      allUsers
        .filter(u => u.role === 'school_admin' && u.school_id && u.is_active)
        .map(u => u.school_id!)
    )
    return schools.filter(s => s.is_active && !adminSchoolIds.has(s.id))
  }, [schools, allUsers])

  const recentSchools = useMemo(() =>
    [...schools].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)
  , [schools])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Business health across all schools</p>
      </div>

      {/* School counts */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Total Schools"    value={stats?.totalSchools}                          icon={School} color="blue"   isLoading={statsLoading} />
        <StatCard label="Active Schools"   value={stats?.activeSchools}                         icon={School} color="green"  isLoading={statsLoading} />
        <StatCard label="Inactive Schools" value={(stats?.totalSchools ?? 0) - (stats?.activeSchools ?? 0)} icon={School} color="slate"  isLoading={statsLoading} />
      </div>

      {/* User counts */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Users"   value={stats?.totalUsers} icon={Users}   color="purple" isLoading={statsLoading} />
        <StatCard label="School Admins" value={stats?.admins}     icon={UserCog} color="blue"   isLoading={statsLoading} />
        <StatCard label="Teachers"      value={stats?.teachers}   icon={UserCog} color="slate"  isLoading={statsLoading} />
        <StatCard label="Parents"       value={stats?.parents}    icon={Users}   color="green"  isLoading={statsLoading} />
      </div>

      {/* Alert — schools needing admin */}
      {schoolsNeedingAdmin.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              {schoolsNeedingAdmin.length} school{schoolsNeedingAdmin.length !== 1 ? 's' : ''} have no admin assigned
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {schoolsNeedingAdmin.map(school => (
              <button
                key={school.id}
                onClick={() => router.push(`/schools/${school.id}`)}
                className="px-2.5 py-1 rounded-md bg-amber-100 border border-amber-300 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors"
              >
                {school.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent schools */}
      {recentSchools.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Recently Added Schools</h2>
            <button
              onClick={() => router.push('/schools')}
              className="text-xs text-blue-600 hover:underline"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSchools.map(school => (
              <div
                key={school.id}
                className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => router.push(`/schools/${school.id}`)}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: school.primary_color ?? '#2563EB' }}
                >
                  {school.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{school.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{school.slug}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-400">{formatRelativeTime(school.created_at)}</span>
                  <Badge variant="outline" className={school.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'text-slate-400'}>
                    {school.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
