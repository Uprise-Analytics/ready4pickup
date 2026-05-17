'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useSchoolClassrooms, useCreateClassroom } from '@hooks/useSchoolAdmin'
import { useAuthStore } from '@store/auth.store'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Switch } from '@components/ui/switch'
import { Skeleton } from '@components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@components/ui/dialog'
import { Plus, BookOpen } from 'lucide-react'

const CLASSROOM_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1']

interface Props {
  schoolId: string
}

export function ClassroomsList({ schoolId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(CLASSROOM_COLORS[0])
  const [isBabyClass, setIsBabyClass] = useState(false)

  const profile = useAuthStore((s) => s.profile)
  const { data: classrooms = [], isLoading } = useSchoolClassrooms(schoolId)
  const { mutateAsync, isPending } = useCreateClassroom()

  async function handleCreate() {
    if (!name.trim()) return
    try {
      await mutateAsync({ schoolId, createdBy: profile!.id, name: name.trim(), isBabyClass, color, capacity: undefined })
      toast.success('Classroom created')
      setName('')
      setColor(CLASSROOM_COLORS[0])
      setIsBabyClass(false)
      setDialogOpen(false)
    } catch {
      toast.error('Failed to create classroom')
    }
  }

  if (isLoading) {
    return <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{classrooms.length} classroom{classrooms.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus size={14} className="mr-1" /> Add Classroom
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {classrooms.map((cls) => (
          <div key={cls.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cls.color + '22' }}>
              <BookOpen size={18} style={{ color: cls.color }} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{cls.name}</p>
              <p className="text-xs text-slate-400">
                {cls.is_baby_class ? 'Baby class' : cls.capacity ? `Cap. ${cls.capacity}` : 'No limit'}
              </p>
            </div>
          </div>
        ))}

        {classrooms.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">No classrooms yet. Add one to get started.</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Classroom</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Classroom Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunflowers" />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2">
                {CLASSROOM_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    type="button"
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isBabyClass} onCheckedChange={setIsBabyClass} id="baby" />
              <Label htmlFor="baby">Baby / Toddler class</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={!name.trim() || isPending} onClick={handleCreate}>
              {isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
