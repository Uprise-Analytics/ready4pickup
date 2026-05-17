'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@components/ui/dialog'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import {
  useCreateAnnouncement, useUpdateAnnouncement, useSchoolClassrooms,
} from '@hooks/useSchoolAdmin'
import { useAuthStore } from '@store/auth.store'
import type { Announcement, AnnouncementAudience } from '@/types/database'
import { Users, GraduationCap, Baby } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  schoolId: string
  existing?: Announcement | null
}

const AUDIENCE_OPTIONS: { value: AnnouncementAudience; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'all',      label: 'Everyone',  icon: <Users size={16} />,        description: 'Parents, teachers & staff' },
  { value: 'teachers', label: 'Teachers',  icon: <GraduationCap size={16} />, description: 'Teaching staff only' },
  { value: 'parents',  label: 'Parents',   icon: <Baby size={16} />,          description: 'Parents & collectors' },
]

export function AnnouncementDialog({ open, onOpenChange, schoolId, existing }: Props) {
  const profile = useAuthStore((s) => s.profile)
  const { mutateAsync: create, isPending: creating } = useCreateAnnouncement()
  const { mutateAsync: update, isPending: updating } = useUpdateAnnouncement()
  const { data: classrooms = [] } = useSchoolClassrooms(schoolId || null)
  const isPending = creating || updating

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<AnnouncementAudience>('all')
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>([])
  const [expiresAt, setExpiresAt] = useState('')
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({})

  useEffect(() => {
    if (!open) return
    if (existing) {
      setTitle(existing.title)
      setBody(existing.body)
      setAudience(existing.target_audience ?? 'all')
      setSelectedClassrooms(existing.target_classroom_ids ?? [])
      setExpiresAt(existing.expires_at ? existing.expires_at.slice(0, 10) : '')
    } else {
      setTitle('')
      setBody('')
      setAudience('all')
      setSelectedClassrooms([])
      setExpiresAt('')
    }
    setErrors({})
  }, [open, existing])

  function toggleClassroom(id: string) {
    setSelectedClassrooms((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function validate() {
    const e: typeof errors = {}
    if (!title.trim()) e.title = 'Title is required'
    if (!body.trim()) e.body = 'Message is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(publish: boolean) {
    if (!validate()) return
    try {
      const expiresAtIso = expiresAt ? new Date(expiresAt).toISOString() : null
      if (existing) {
        await update({
          id: existing.id,
          schoolId: existing.school_id,
          title: title.trim(),
          body: body.trim(),
          targetAudience: audience,
          targetClassroomIds: audience === 'parents' ? selectedClassrooms : [],
          expiresAt: expiresAtIso,
        })
        toast.success('Announcement updated')
      } else {
        await create({
          schoolId,
          createdBy: profile!.id,
          title: title.trim(),
          body: body.trim(),
          publish,
          targetAudience: audience,
          targetClassroomIds: audience === 'parents' ? selectedClassrooms : [],
          expiresAt: expiresAtIso,
        })
        toast.success(publish ? 'Announcement published' : 'Saved as draft')
      }
      onOpenChange(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save announcement')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Title</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. School Closure — Friday"
            />
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-body">Message</Label>
            <textarea
              id="ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Write your announcement here…"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            {errors.body && <p className="text-xs text-red-500">{errors.body}</p>}
          </div>

          {/* Send To */}
          <div className="space-y-2">
            <Label>Send To</Label>
            <div className="grid grid-cols-3 gap-2">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setAudience(opt.value); setSelectedClassrooms([]) }}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                    audience === opt.value
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className={audience === opt.value ? 'text-blue-600' : 'text-slate-400'}>
                    {opt.icon}
                  </span>
                  <span>{opt.label}</span>
                  <span className={`text-xs font-normal ${audience === opt.value ? 'text-blue-500' : 'text-slate-400'}`}>
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Classroom selector — only when targeting parents */}
          {audience === 'parents' && classrooms.length > 0 && (
            <div className="space-y-2">
              <Label>Classrooms (optional)</Label>
              <p className="text-xs text-slate-400">Leave empty to send to all parents. Select specific classrooms to target only parents of children in those classes.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {classrooms.map((cls) => {
                  const selected = selectedClassrooms.includes(cls.id)
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => toggleClassroom(cls.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: selected ? 'white' : (cls.color ?? '#94a3b8') }}
                      />
                      {cls.name}
                    </button>
                  )
                })}
              </div>
              {selectedClassrooms.length > 0 && (
                <p className="text-xs text-blue-600">{selectedClassrooms.length} classroom{selectedClassrooms.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}

          {/* Expiry */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-expires">Expiry Date (optional)</Label>
            <Input
              id="ann-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-slate-400">After this date the announcement will stop showing to users</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {existing ? (
            <Button onClick={() => handleSubmit(true)} disabled={isPending}>
              {isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => handleSubmit(false)} disabled={isPending}>
                Save Draft
              </Button>
              <Button onClick={() => handleSubmit(true)} disabled={isPending}>
                {isPending ? 'Publishing…' : 'Publish'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
