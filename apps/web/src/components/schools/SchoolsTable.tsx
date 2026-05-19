'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@components/ui/input'
import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@components/ui/alert-dialog'
import { EditSchoolDialog } from './EditSchoolDialog'
import { useUpdateSchool, useDeleteSchool } from '@hooks/useAdmin'
import { toast } from 'sonner'
import type { School } from '@/types/database'
import { Search, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

interface Props {
  schools: School[]
}

export function SchoolsTable({ schools }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [editSchool, setEditSchool] = useState<School | null>(null)
  const [deleteSchool, setDeleteSchool] = useState<School | null>(null)
  const { mutateAsync: updateSchool } = useUpdateSchool()
  const { mutateAsync: deleteSchoolMut, isPending: isDeleting } = useDeleteSchool()

  const filtered = schools.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.slug.includes(search.toLowerCase())
  )

  async function handleToggleActive(e: React.MouseEvent, school: School) {
    e.stopPropagation()
    try {
      await updateSchool({ id: school.id, is_active: !school.is_active })
      toast.success(school.is_active ? 'School deactivated' : 'School activated')
    } catch {
      toast.error('Failed to update school')
    }
  }

  async function handleDelete() {
    if (!deleteSchool) return
    try {
      await deleteSchoolMut(deleteSchool.id)
      toast.success('School deleted')
      setDeleteSchool(null)
    } catch {
      toast.error('Failed to delete school')
    }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-8 h-8 text-sm" placeholder="Search schools..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-400 py-10">No schools found</TableCell>
              </TableRow>
            ) : (
              filtered.map((school) => (
                <TableRow
                  key={school.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/schools/${school.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: school.primary_color ?? '#2563EB' }}
                      >
                        {school.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{school.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{school.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-500">
                      {school.email && <p>{school.email}</p>}
                      {school.phone && <p>{school.phone}</p>}
                      {!school.email && !school.phone && <span className="text-slate-300">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={school.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'text-slate-400'}>
                      {school.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                        onClick={(e) => { e.stopPropagation(); setEditSchool(school) }}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className={`h-7 w-7 p-0 ${school.is_active ? 'text-slate-400 hover:text-amber-600' : 'text-amber-500 hover:text-green-600'}`}
                        onClick={(e) => handleToggleActive(e, school)}
                        title={school.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {school.is_active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); setDeleteSchool(school) }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditSchoolDialog
        school={editSchool}
        open={!!editSchool}
        onOpenChange={(open) => { if (!open) setEditSchool(null) }}
      />

      <AlertDialog open={!!deleteSchool} onOpenChange={(open) => { if (!open) setDeleteSchool(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteSchool?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the school and cannot be undone. All associated data may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
