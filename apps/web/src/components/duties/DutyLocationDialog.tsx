'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@components/ui/dialog'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Switch } from '@components/ui/switch'
import { useCreateDutyLocation, useUpdateDutyLocation } from '@hooks/useDuties'
import type { DutyLocation } from '@/types/database'

interface Props {
  open: boolean
  onClose: () => void
  schoolId: string
  userId: string
  initial?: DutyLocation | null
}

export function DutyLocationDialog({ open, onClose, schoolId, userId, initial }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  const { mutate: create, isPending: creating } = useCreateDutyLocation()
  const { mutate: update, isPending: updating } = useUpdateDutyLocation()
  const isPending = creating || updating

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '')
      setDescription(initial?.description ?? '')
      setIsActive(initial?.is_active ?? true)
    }
  }, [open, initial])

  const handleSave = () => {
    if (!name.trim()) return
    if (initial) {
      update(
        { id: initial.id, schoolId, name: name.trim(), description: description.trim() || undefined, isActive },
        { onSuccess: onClose },
      )
    } else {
      create(
        { schoolId, name: name.trim(), description: description.trim() || undefined, createdBy: userId },
        { onSuccess: onClose },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Location' : 'New Duty Location'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="loc-name">Location name *</Label>
            <Input
              id="loc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Playground, Main Gate"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loc-desc">Description</Label>
            <Input
              id="loc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about this location"
            />
          </div>

          {initial && (
            <div className="flex items-center gap-3">
              <Switch id="loc-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="loc-active">Active</Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending ? 'Saving…' : 'Save Location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
