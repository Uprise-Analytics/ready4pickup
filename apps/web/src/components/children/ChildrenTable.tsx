'use client'

import { useState } from 'react'
import { Input } from '@components/ui/input'
import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@components/ui/table'
import type { Child } from '@/types/database'
import { getInitials, getAvatarColor } from '@utils/format'
import { Search, AlertTriangle, Pencil, UserX, UserCheck } from 'lucide-react'
import { useUpdateChild } from '@hooks/useSchoolAdmin'
import { toast } from 'sonner'

interface Props {
  children: Child[]
  onEdit: (child: Child) => void
}

export function ChildrenTable({ children, onEdit }: Props) {
  const [search, setSearch] = useState('')
  const { mutateAsync: updateChild, isPending } = useUpdateChild()

  const filtered = children.filter((c) => {
    const name = `${c.first_name} ${c.last_name}`.toLowerCase()
    return !search || name.includes(search.toLowerCase())
  })

  async function handleToggleActive(child: Child, e: React.MouseEvent) {
    e.stopPropagation()
    const action = child.is_active ? 'Deactivate' : 'Reactivate'
    if (!confirm(`${action} ${child.first_name} ${child.last_name}?`)) return
    try {
      await updateChild({ id: child.id, schoolId: child.school_id, isActive: !child.is_active })
      toast.success(`${child.first_name} ${child.is_active ? 'deactivated' : 'reactivated'}`)
    } catch { toast.error(`Failed to ${action.toLowerCase()} child`) }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-100">
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Classroom</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Allergies</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-slate-400 py-10">No children found</TableCell>
            </TableRow>
          ) : (
            filtered.map((child) => {
              const name = `${child.first_name} ${child.last_name}`
              const initials = getInitials(name)
              const color = getAvatarColor(name)
              return (
                <TableRow
                  key={child.id}
                  className={`cursor-pointer hover:bg-slate-50 ${!child.is_active ? 'opacity-60' : ''}`}
                  onClick={() => onEdit(child)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      {child.avatar_url ? (
                        <img
                          src={child.avatar_url}
                          alt={name}
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
                      <span className="font-medium text-slate-800 text-sm">{name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">{child.classroom ?? <span className="text-slate-300">—</span>}</TableCell>
                  <TableCell className="text-slate-600 text-sm">{child.grade ?? <span className="text-slate-300">—</span>}</TableCell>
                  <TableCell>
                    {child.allergies && child.allergies.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <AlertTriangle size={12} className="text-amber-500" />
                        <span className="text-xs text-amber-700">{child.allergies.join(', ')}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={child.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}>
                      {child.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                        onClick={(e) => { e.stopPropagation(); onEdit(child) }}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 w-7 p-0 ${child.is_active ? 'text-slate-400 hover:text-amber-600' : 'text-slate-400 hover:text-green-600'}`}
                        disabled={isPending}
                        onClick={(e) => handleToggleActive(child, e)}
                        title={child.is_active ? 'Deactivate' : 'Reactivate'}
                      >
                        {child.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
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
