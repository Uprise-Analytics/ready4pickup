'use client'

import { useAuthStore } from '@store/auth.store'
import { useSchoolStats } from '@hooks/useSchoolAdmin'
import { usePlatformStats } from '@hooks/useAdmin'
import { StatCard } from '@components/dashboard/StatCard'
import {
  Baby, Users, AlertTriangle, School,
  UserCheck, LogIn, UserCog, Truck,
} from 'lucide-react'

export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile)

  if (!profile) return null

  return profile.role === 'platform_owner'
    ? <PlatformDashboard />
    : <SchoolDashboard schoolId={profile.school_id ?? ''} />
}

function SchoolDashboard({ schoolId }: { schoolId: string }) {
  const { data, isLoading } = useSchoolStats(schoolId)

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
        <StatCard label="Total Staff"  value={data?.totalStaff}  icon={Users}    color="slate" isLoading={isLoading} />
        <StatCard label="Teachers"     value={data?.teachers}    icon={UserCog}  color="blue"  isLoading={isLoading} />
        <StatCard label="Parents"      value={data?.parents}     icon={Users}    color="green" isLoading={isLoading} />
      </div>
    </div>
  )
}

function PlatformDashboard() {
  const { data, isLoading } = usePlatformStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
        <p className="text-sm text-slate-500 mt-1">High-level stats across all schools</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Total Schools"  value={data?.totalSchools}  icon={School}   color="blue"   isLoading={isLoading} />
        <StatCard label="Active Schools" value={data?.activeSchools} icon={School}   color="green"  isLoading={isLoading} />
        <StatCard label="Total Users"    value={data?.totalUsers}    icon={Users}    color="purple" isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="School Admins" value={data?.admins}     icon={UserCog}       color="slate" isLoading={isLoading} />
        <StatCard label="Teachers"      value={data?.teachers}   icon={UserCog}       color="blue"  isLoading={isLoading} />
        <StatCard label="Parents"       value={data?.parents}    icon={Users}         color="green" isLoading={isLoading} />
      </div>
    </div>
  )
}
