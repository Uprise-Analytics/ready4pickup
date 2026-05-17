'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@components/ui/input'
import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@components/ui/table'
import { useDeactivateUser, useDeleteUser } from '@hooks/useAdmin'
import type { Profile } from '@/types/database'
import { getInitials, getAvatarColor } from '@utils/format'
import { Search, Pencil, UserX, UserCheck, Trash2 } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  school_admin: 'Admin', teacher: 'Teacher', parent: 'Parent',
  collector: 'Collector', platform_owner: 'Platform',
}

const ROLE_COLORS: Record<string, string> = {
  school_admin: 'bg-purple-50 text-purple-700',
  teacher: 'bg-blue-50 text-blue-700',
  parent: 'bg-green-50 text-green-700',
  collector: 'bg-amber-50 text-amber-700',
  platform_owner: 'bg-slate-100 text-slate-700',
}

interface Props {
  users: Profile[]
  schoolId: string
  onEdit: (user: Profile) => void
}

export function PeopleTable({ users, onEdit }: Props) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const { mutateAsync: deactivate, isPending: deactivating } = useDeactivateUser()
  const { mutateAsync: deleteUser, isPending: deleting } = useDeleteUser()

  const filtered = users.filter((u) => {
    const matchSearch = !search
      || u.full_name.toLowerCase().includes(search.toLowerCase())
      || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  async function handleToggleActive(user: Profile, e: React.MouseEvent) {
    e.stopPropagation()
    const action = user.is_active ? 'Deactivate' : 'Reactivate'
    if (!confirm(`${action} ${user.full_name}?`)) return
    try {
      await deactivate({ userId: user.id, isActive: !user.is_active })
      toast.success(`${user.full_name} ${user.is_active ? 'deactivated' : 'reactivated'}`)
    } catch {
      toast.error(`Failed to ${action.toLowerCase()} user`)
    }
  }

  async function handleDelete(user: Profile, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Permanently delete ${user.full_name}? This cannot be undone.`)) return
    try {
      await deleteUser(user.id)
      toast.success(`${user.full_name} deleted`)
    } catch {
      toast.error('Failed to delete user')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search by name or email..."
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
          <option value="school_admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="parent">Parent</option>
          <option value="collector">Collector</option>
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-slate-400 py-10">No people found</TableCell>
            </TableRow>
          ) : (
            filtered.map((user) => {
              const initials = getInitials(user.full_name)
              const color = getAvatarColor(user.full_name)
              return (
                <TableRow
                  key={user.id}
                  className={`cursor-pointer hover:bg-slate-50 ${!user.is_active ? 'opacity-60' : ''}`}
                  onClick={() => onEdit(user)}
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
                        onClick={(e) => { e.stopPropagation(); onEdit(user) }}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 w-7 p-0 ${user.is_active ? 'text-slate-400 hover:text-amber-600' : 'text-slate-400 hover:text-green-600'}`}
                        disabled={deactivating}
                        onClick={(e) => handleToggleActive(user, e)}
                        title={user.is_active ? 'Deactivate' : 'Reactivate'}
                      >
                        {user.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                        disabled={deleting}
                        onClick={(e) => handleDelete(user, e)}
                        title="Delete"
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
    </div>
  )
}
