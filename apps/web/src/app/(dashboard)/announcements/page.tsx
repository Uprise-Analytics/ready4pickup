'use client'

import { useState } from 'react'
import { useAuthStore } from '@store/auth.store'
import {
  useSchoolAnnouncements, useToggleAnnouncement, useDeleteAnnouncement, useSchoolClassrooms,
} from '@hooks/useSchoolAdmin'
import { AnnouncementDialog } from '@components/announcements/AnnouncementDialog'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Skeleton } from '@components/ui/skeleton'
import { toast } from 'sonner'
import { Megaphone, Plus, Pencil, Trash2, Globe, EyeOff, Clock, Users, GraduationCap, Baby } from 'lucide-react'
import type { Announcement } from '@/types/database'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const AUDIENCE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  all:      { label: 'Everyone',  icon: <Users size={12} />,         color: 'bg-slate-100 text-slate-600' },
  teachers: { label: 'Teachers',  icon: <GraduationCap size={12} />, color: 'bg-blue-50 text-blue-600' },
  parents:  { label: 'Parents',   icon: <Baby size={12} />,          color: 'bg-green-50 text-green-700' },
}

export default function AnnouncementsPage() {
  const profile = useAuthStore((s) => s.profile)
  const schoolId = profile?.school_id ?? ''

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Announcement | null>(null)
  const [tab, setTab] = useState<'all' | 'live' | 'drafts'>('all')

  const { data: announcements = [], isLoading } = useSchoolAnnouncements(schoolId)
  const { data: classrooms = [] } = useSchoolClassrooms(schoolId || null)
  const { mutateAsync: toggle, isPending: toggling } = useToggleAnnouncement()
  const { mutateAsync: deleteAnn, isPending: deleting } = useDeleteAnnouncement()

  function openCreate() { setEditTarget(null); setDialogOpen(true) }
  function openEdit(ann: Announcement) { setEditTarget(ann); setDialogOpen(true) }

  async function handleToggle(ann: Announcement) {
    try {
      await toggle({ id: ann.id, publish: !ann.is_published })
      toast.success(ann.is_published ? 'Announcement unpublished' : 'Announcement published')
    } catch { toast.error('Failed to update announcement') }
  }

  async function handleDelete(ann: Announcement) {
    if (!confirm(`Delete "${ann.title}"? This cannot be undone.`)) return
    try {
      await deleteAnn({ id: ann.id, schoolId: ann.school_id })
      toast.success('Announcement deleted')
    } catch { toast.error('Failed to delete announcement') }
  }

  const now = new Date()
  const displayed = announcements.filter((a) => {
    if (tab === 'live') return a.is_published
    if (tab === 'drafts') return !a.is_published
    return true
  })
  const publishedCount = announcements.filter((a) => a.is_published).length
  const draftCount = announcements.filter((a) => !a.is_published).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Megaphone size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
            <p className="text-sm text-slate-500">
              {publishedCount} live · {draftCount} draft{draftCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus size={15} className="mr-1.5" />
          New Announcement
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['all', 'live', 'drafts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'live' ? 'Published' : t === 'drafts' ? 'Drafts' : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
            <Megaphone size={22} className="text-indigo-400" />
          </div>
          <p className="text-slate-600 font-medium">No announcements yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first announcement to notify parents and staff</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus size={15} className="mr-1.5" /> New Announcement
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((ann) => {
            const isExpired = ann.expires_at && new Date(ann.expires_at) < now
            const audienceMeta = AUDIENCE_LABELS[ann.target_audience ?? 'all']
            const classroomNames = (ann.target_classroom_ids ?? [])
              .map((id) => classrooms.find((c) => c.id === id)?.name)
              .filter(Boolean)

            return (
              <div
                key={ann.id}
                className={`bg-white rounded-xl border p-5 transition-opacity ${
                  ann.is_published && !isExpired ? 'border-slate-200' : 'border-slate-100 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title + status badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900 text-base">{ann.title}</h3>
                      {ann.is_published && !isExpired && <Badge className="text-xs bg-green-50 text-green-700">Live</Badge>}
                      {ann.is_published && isExpired && <Badge className="text-xs bg-slate-100 text-slate-500">Expired</Badge>}
                      {!ann.is_published && <Badge className="text-xs bg-amber-50 text-amber-700">Draft</Badge>}
                    </div>

                    {/* Body */}
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-3">{ann.body}</p>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Audience pill */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${audienceMeta.color}`}>
                        {audienceMeta.icon}
                        {audienceMeta.label}
                      </span>

                      {/* Targeted classrooms */}
                      {classroomNames.length > 0 ? (
                        classroomNames.map((name) => (
                          <span key={name} className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                            {name}
                          </span>
                        ))
                      ) : ann.target_audience === 'parents' ? (
                        <span className="text-slate-400">All parents</span>
                      ) : null}

                      {/* Dates */}
                      {ann.published_at && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Globe size={11} /> {formatDate(ann.published_at)}
                        </span>
                      )}
                      {!ann.is_published && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <EyeOff size={11} /> Not visible to users
                        </span>
                      )}
                      {ann.expires_at && (
                        <span className={`flex items-center gap-1 ${isExpired ? 'text-red-400' : 'text-slate-400'}`}>
                          <Clock size={11} /> {isExpired ? 'Expired' : 'Expires'} {formatDate(ann.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm" variant="ghost"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                      onClick={() => openEdit(ann)} title="Edit"
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className={`h-8 w-8 p-0 ${ann.is_published ? 'text-slate-400 hover:text-amber-600' : 'text-slate-400 hover:text-green-600'}`}
                      disabled={toggling}
                      onClick={() => handleToggle(ann)}
                      title={ann.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {ann.is_published ? <EyeOff size={14} /> : <Globe size={14} />}
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                      disabled={deleting}
                      onClick={() => handleDelete(ann)} title="Delete"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditTarget(null) }}
        schoolId={schoolId}
        existing={editTarget}
      />
    </div>
  )
}
