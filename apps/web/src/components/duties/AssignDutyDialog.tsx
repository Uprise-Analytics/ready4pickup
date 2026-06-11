'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@components/ui/dialog'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { useCreateDutyAssignment, useUpdateDutyAssignment } from '@hooks/useDuties'
import type { DutyLocation, DutyAssignmentWithDetails } from '@/types/database'

interface Props {
  open: boolean
  onClose: () => void
  schoolId: string
  userId: string
  locations: DutyLocation[]
  teachers: { id: string; full_name: string; email: string }[]
  initial?: DutyAssignmentWithDetails | null
}

export function AssignDutyDialog({ open, onClose, schoolId, userId, locations, teachers, initial }: Props) {
  const [teacherId, setTeacherId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [dutyDate, setDutyDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('09:00')
  const [notes, setNotes] = useState('')

  const { mutate: create, isPending: creating } = useCreateDutyAssignment()
  const { mutate: update, isPending: updating } = useUpdateDutyAssignment()
  const isPending = creating || updating

  const activeLocations = locations.filter((l) => l.is_active)

  useEffect(() => {
    if (open) {
      if (initial) {
        setTeacherId(initial.teacher_id)
        setLocationId(initial.location_id)
        setDutyDate(initial.duty_date)
        setStartTime(initial.start_time.slice(0, 5))
        setEndTime(initial.end_time.slice(0, 5))
        setNotes(initial.notes ?? '')
      } else {
        setTeacherId(teachers[0]?.id ?? '')
        setLocationId(activeLocations[0]?.id ?? '')
        setDutyDate(format(new Date(), 'yyyy-MM-dd'))
        setStartTime('08:00')
        setEndTime('09:00')
        setNotes('')
      }
    }
  }, [open, initial, teachers, activeLocations])

  const canSave = teacherId && locationId && dutyDate && startTime && endTime && startTime < endTime

  const handleSave = () => {
    if (!canSave) return
    if (initial) {
      update(
        { id: initial.id, schoolId, teacherId, locationId, dutyDate, startTime, endTime, notes: notes.trim() || null },
        { onSuccess: onClose },
      )
    } else {
      create(
        { schoolId, teacherId, locationId, dutyDate, startTime, endTime, notes: notes.trim() || undefined, createdBy: userId },
        { onSuccess: onClose },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Assignment' : 'Assign Duty'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="duty-teacher">Teacher *</Label>
            <select
              id="duty-teacher"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {teachers.length === 0 && <option value="">No active teachers</option>}
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="duty-location">Location *</Label>
            <select
              id="duty-location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {activeLocations.length === 0 && <option value="">No active locations</option>}
              {activeLocations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="duty-date">Date *</Label>
            <Input
              id="duty-date"
              type="date"
              value={dutyDate}
              onChange={(e) => setDutyDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="duty-start">Start time *</Label>
              <Input
                id="duty-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duty-end">End time *</Label>
              <Input
                id="duty-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          {startTime >= endTime && startTime && endTime && (
            <p className="text-xs text-red-500">End time must be after start time</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="duty-notes">Notes</Label>
            <textarea
              id="duty-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional instructions..."
              rows={2}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending || !canSave}>
            {isPending ? 'Saving…' : 'Save Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
