'use client'

import { use, useState, useMemo } from 'react'
import Link from 'next/link'
import { useSchoolDetail, useAllUsers, useUpdateSchool, useUpdateUserRole } from '@hooks/useAdmin'
import { StatCard } from '@components/dashboard/StatCard'
import { EditSchoolDialog } from '@components/schools/EditSchoolDialog'
import { AssignAdminDialog } from '@components/schools/AssignAdminDialog'
import { Skeleton } from '@components/ui/skeleton'
import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import { Switch } from '@components/ui/switch'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@components/ui/alert-dialog'
import { toast } from 'sonner'
import { getInitials, getAvatarColor, formatDate } from '@utils/format'
import {
  ArrowLeft, MapPin, Phone, Mail, Users, UserCog,
  AlertTriangle, Pencil,
} from 'lucide-react'
import type { UserRole, Profile } from '@/types/database'

export default function SchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: school, isLoading: schoolLoading } = useSchoolDetail(id)
  const { data: users = [], isLoading: usersLoading } = useAllUsers({ schoolId: id })
  const { mutateAsync: updateSchool, isPending: togglingSchool } = useUpdateSchool()
  const { mutateAsync: updateRole } = useUpdateUserRole()
  const { mutateAsync: deactivateUser } = useDeactivateUser()

  const [editOpen, setEditOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [removeAdmin, setRemoveAdmin] = useState<Profile | null>(null)

  const admins = useMemo(() => users.filter(u => u.role === 'school_admin'), [users])

  async function handleToggleSchoolActive(checked: boolean) {
    try {
      await updateSchool({ id, is_active: checked })
      toast.success(checked ? 'School activated' : 'School deactivated')
    } catch {
      toast.error('Failed to update school')
    }
  }

  async function handleRemoveAdmin() {
    if (!removeAdmin) return
    try {
      await updateRole({ userId: removeAdmin.id, role: 'teacher', schoolId: id })
      toast.success(`${removeAdmin.full_name} is now a Teacher`)
      setRemoveAdmin(null)
    } catch {
      toast.error('Failed to remove admin')
    }
  }

  if (schoolLoading) return <Skeleton className="h-64 w-full" />
  if (!school) return <p className="text-slate-400">School not found</p>

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/schools">
        <Button variant="ghost" size="sm" className="text-slate-500 -ml-1">
          <ArrowLeft size={15} className="mr-1" /> Schools
        </Button>
      </Link>

      {/* School Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
              style={{ backgroundColor: school.primary_color ?? '#2563EB' }}
            >
              {school.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{school.name}</h1>
                <Badge variant="outline" className={school.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'text-slate-400'}>
                  {school.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 mt-1.5 text-sm text-slate-500">
                {school.address && <span className="flex items-center gap-1"><MapPin size={12} />{school.address}</span>}
                {school.phone   && <span className="flex items-center gap-1"><Phone size={12} />{school.phone}</span>}
                {school.email   && <span className="flex items-center gap-1"><Mail size={12} />{school.email}</span>}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Added {formatDate(school.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{school.is_active ? 'Active' : 'Inactive'}</span>
              <Switch
                checked={school.is_active}
                onCheckedChange={handleToggleSchoolActive}
                disabled={togglingSchool}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil size={13} className="mr-1.5" /> Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Members"  value={usersLoading ? undefined : users.length} icon={Users}   color="blue"                                    isLoading={usersLoading} />
        <StatCard label="School Admins"  value={usersLoading ? undefined : admins.length} icon={UserCog} color={admins.length === 0 ? 'red' : 'green'}  isLoading={usersLoading} />
      </div>

      {/* Admins Section */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">School Admins</h2>
          <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
            <UserCog size={13} className="mr-1.5" /> Assign Admin
          </Button>
        </div>

        {admins.length === 0 ? (
          <div className="px-5 py-4 flex items-start gap-3 bg-amber-50 rounded-b-xl">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              No admin assigned — this school cannot be managed by anyone. Use "Assign Admin" to fix this.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {admins.map(admin => {
              const initials = getInitials(admin.full_name)
              const avatarColor = getAvatarColor(admin.full_name)
              return (
                <div key={admin.id} className="flex items-center gap-3 px-5 py-3">
                  {admin.avatar_url ? (
                    <img src={admin.avatar_url} alt={admin.full_name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: avatarColor }}>
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{admin.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">{admin.email}</p>
                  </div>
                  <Button
                    size="sm" variant="ghost"
                    className="text-xs text-slate-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setRemoveAdmin(admin)}
                  >
                    Remove Admin
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <EditSchoolDialog school={school} open={editOpen} onOpenChange={setEditOpen} />
      <AssignAdminDialog schoolId={id} members={users} open={assignOpen} onOpenChange={setAssignOpen} />

      <AlertDialog open={!!removeAdmin} onOpenChange={(open) => { if (!open) setRemoveAdmin(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeAdmin?.full_name} as admin?</AlertDialogTitle>
            <AlertDialogDescription>
              Their role will be changed to Teacher. You can reassign them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAdmin}>Remove Admin</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
