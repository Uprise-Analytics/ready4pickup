'use client'

import { useState } from 'react'
import { useAllUsers, useDeactivateUser, useDeleteUser } from '@hooks/useAdmin'
import { Input } from '@components/ui/input'
import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import { Skeleton } from '@components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@components/ui/table'
import { CreateUserDialog } from '@components/people/CreateUserDialog'
import { EditUserDialog } from '@components/people/EditUserDialog'
import { getInitials, getAvatarColor, formatDateTime } from '@utils/format'
import { toast } from 'sonner'
import type { Profile } from '@/types/database'
import { Users, UserPlus, Search, UserX, UserCheck, Trash2, Pencil } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  platform_owner: 'Platform Owner',
  school_admin: 'School Admin',
  teacher: 'Teacher',
  parent: 'Parent',
  collector: 'Collector',
}

const ROLE_COLORS: Record<string, string> = {
  platform_owner: 'bg-purple-50 text-purple-700',
  school_admin: 'bg-blue-50 text-blue-700',
  teacher: 'bg-green-50 text-green-700',
  parent: 'bg-amber-50 text-amber-700',
  collector: 'bg-slate-100 text-slate-600',
}

export default function UsersPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const { data: users = [], isLoading } = useAllUsers()
  const { mutateAsync: deactivate, isPending: deactivating } = useDeactivateUser()
  const { mutateAsync: deleteUser, isPending: deleting } = useDeleteUser()

  const filtered = users.filter((u) => {
    const matchSearch = !search
      || u.full_name.toLowerCase().includes(search.toLowerCase())
      || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  async function handleToggleActive(user: Profile) {
    const action = user.is_active ? 'Deactivate' : 'Reactivate'
    if (!confirm(`${action} ${user.full_name}?`)) return
    try {
      await deactivate({ userId: user.id, isActive: !user.is_active })
      toast.success(`User ${user.is_active ? 'deactivated' : 'reactivated'}`)
    } catch { toast.error(`Failed to ${action.toLowerCase()} user`) }
  }

  async function handleDelete(user: Profile) {
    if (!confirm(`Permanently delete ${user.full_name}? This cannot be undone.`)) return
    try {
      await deleteUser(user.id)
      toast.success('User deleted')
    } catch { toast.error('Failed to delete user') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
            <Users size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">All Users</h1>
            <p className="text-sm text-slate-500">{users.length} total users</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus size={15} className="mr-1.5" />
          Add User
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            <option value="platform_owner">Platform Owner</option>
            <option value="school_admin">School Admin</option>
            <option value="teacher">Teacher</option>
            <option value="parent">Parent</option>
            <option value="collector">Collector</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-10">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => {
                  const initials = getInitials(user.full_name)
                  const color = getAvatarColor(user.full_name)
                  return (
                    <TableRow
                      key={user.id}
                      className={`cursor-pointer hover:bg-slate-50 ${!user.is_active ? 'opacity-60' : ''}`}
                      onClick={() => setEditUser(user)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name}
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: color }}
                            >
                              {initials}
                            </div>
                          )}
                          <span className="font-medium text-slate-800 text-sm">{user.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs font-medium ${ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
                          {ROLE_LABELS[user.role] ?? user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                        {formatDateTime(user.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge className={user.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                            onClick={(e) => { e.stopPropagation(); setEditUser(user) }}
                            title="Edit user"
                          >
                            <Pencil size={13} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`h-7 w-7 p-0 ${user.is_active ? 'text-slate-400 hover:text-amber-600' : 'text-slate-400 hover:text-green-600'}`}
                            disabled={deactivating}
                            onClick={(e) => { e.stopPropagation(); handleToggleActive(user) }}
                            title={user.is_active ? 'Deactivate' : 'Reactivate'}
                          >
                            {user.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                            disabled={deleting}
                            onClick={(e) => { e.stopPropagation(); handleDelete(user) }}
                            title="Delete user"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} schoolId="" />
      <EditUserDialog user={editUser} open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null) }} />
    </div>
  )
}
