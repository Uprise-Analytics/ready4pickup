'use client'

import { use } from 'react'
import Link from 'next/link'
import { useSchoolDetail, useAllUsers, useUpdateUserRole } from '@hooks/useAdmin'
import { useSchoolStats, useSchoolIncidents } from '@hooks/useSchoolAdmin'
import { StatCard } from '@components/dashboard/StatCard'
import { Skeleton } from '@components/ui/skeleton'
import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@components/ui/select'
import { formatDateTime } from '@utils/format'
import { toast } from 'sonner'
import {
  Baby, Users, Truck, AlertTriangle, ArrowLeft, MapPin, Phone, Mail,
} from 'lucide-react'
import type { UserRole } from '@/types/database'

export default function SchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: school, isLoading: schoolLoading } = useSchoolDetail(id)
  const { data: stats, isLoading: statsLoading } = useSchoolStats(id)
  const { data: users = [], isLoading: usersLoading } = useAllUsers({ schoolId: id })
  const { data: incidents = [] } = useSchoolIncidents(id)
  const { mutateAsync: updateRole } = useUpdateUserRole()

  const openIncidents = incidents.filter((i) => !i.is_resolved).length

  async function handleRoleChange(userId: string, role: UserRole) {
    try {
      await updateRole({ userId, role, schoolId: id ?? null })
      toast.success('Role updated')
    } catch {
      toast.error('Failed to update role')
    }
  }

  if (schoolLoading) return <Skeleton className="h-64 w-full" />

  if (!school) return <p className="text-slate-400">School not found</p>

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link href="/schools">
          <Button variant="ghost" size="sm" className="text-slate-500 -ml-1">
            <ArrowLeft size={15} className="mr-1" /> Schools
          </Button>
        </Link>
      </div>

      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
          style={{ backgroundColor: school.primary_color ?? '#2563EB' }}
        >
          {school.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{school.name}</h1>
            <Badge className={school.is_active ? 'bg-green-50 text-green-700' : 'text-slate-400'}>
              {school.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4 mt-1 text-sm text-slate-500">
            {school.address && <span className="flex items-center gap-1"><MapPin size={12} />{school.address}</span>}
            {school.phone && <span className="flex items-center gap-1"><Phone size={12} />{school.phone}</span>}
            {school.email && <span className="flex items-center gap-1"><Mail size={12} />{school.email}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Children"     value={stats?.totalChildren}  icon={Baby}          color="blue"   isLoading={statsLoading} />
        <StatCard label="Staff"        value={stats?.totalStaff}     icon={Users}         color="purple" isLoading={statsLoading} />
        <StatCard label="Live Pickups" value={stats?.livePickups}    icon={Truck}         color="amber"  isLoading={statsLoading} />
        <StatCard label="Open Incidents" value={openIncidents}       icon={AlertTriangle} color="red"    isLoading={statsLoading} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">School Members</h2>
        </div>
        {usersLoading ? (
          <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No members yet</p>
            ) : (
              users.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{user.full_name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select
                      defaultValue={user.role}
                      onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}
                    >
                      <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="school_admin">School Admin</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="collector">Collector</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge className={user.is_active ? 'bg-green-50 text-green-700' : 'text-slate-400'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">Created {formatDateTime(school.created_at)}</p>
    </div>
  )
}
