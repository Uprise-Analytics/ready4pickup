'use client'

import { useAuthStore } from '@store/auth.store'
import { useMyNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@hooks/useTeacher'
import { Button } from '@components/ui/button'
import { Skeleton } from '@components/ui/skeleton'
import { Bell, CheckCheck, Circle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

const TYPE_CONFIG: Record<string, { label: string; emoji: string; className: string }> = {
  pickup_update:   { label: 'Pickup',     emoji: '🚗', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  announcement:    { label: 'Announcement', emoji: '📢', className: 'bg-teal-50 text-teal-700 border-teal-200' },
  diaper_change:   { label: 'Diaper',     emoji: '🩱', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  bottle_log:      { label: 'Bottle',     emoji: '🍼', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  incident_report: { label: 'Incident',   emoji: '🚨', className: 'bg-red-50 text-red-700 border-red-200' },
  consumable_low:  { label: 'Low Supply', emoji: '⚠️', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  stock_take:      { label: 'Stock Take',    emoji: '📋', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  inventory_event: { label: 'Inventory',     emoji: '🗂️', className: 'bg-slate-50 text-slate-700 border-slate-200' },
  plan_approved:   { label: 'Plan Approved', emoji: '✅', className: 'bg-green-50 text-green-700 border-green-200' },
  plan_rejected:   { label: 'Plan Revision', emoji: '🔄', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  plan_submitted:  { label: 'Plan Submitted', emoji: '📋', className: 'bg-violet-50 text-violet-700 border-violet-200' },
}

export default function TeacherNotificationsPage() {
  const { profile } = useAuthStore()
  const userId = profile?.id ?? null

  const { data: notifications = [], isLoading } = useMyNotifications(userId)
  const markRead    = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkAll = async () => {
    if (!userId) return
    try {
      await markAllRead.mutateAsync(userId)
      toast.success('All notifications marked as read')
    } catch (err: any) { toast.error(err.message) }
  }

  const handleMarkOne = async (id: string) => {
    if (!userId) return
    await markRead.mutateAsync({ id, userId })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center">
            <Bell size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
            <p className="text-sm text-slate-500">
              {unreadCount > 0 ? `${unreadCount} unread · ` : ''}{notifications.length} total
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAll}
            disabled={markAllRead.isPending}
            className="gap-1.5 text-slate-600"
          >
            <CheckCheck size={14} />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-20 text-center">
          <Bell size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600">No notifications yet</p>
          <p className="text-sm text-slate-400 mt-1">Pickup updates, incidents, and announcements will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {notifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type] ?? { label: notif.type, emoji: '🔔', className: 'bg-slate-50 text-slate-600 border-slate-200' }
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${!notif.is_read ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}
              >
                {/* Unread dot */}
                <div className="mt-1 flex-shrink-0">
                  {notif.is_read
                    ? <Circle size={8} className="text-slate-300 fill-slate-300" />
                    : <Circle size={8} className="text-blue-500 fill-blue-500" />
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${config.className}`}>
                      {config.emoji} {config.label}
                    </span>
                    <span className="text-xs text-slate-400">{format(new Date(notif.created_at), 'MMM d · h:mm a')}</span>
                  </div>
                  <p className={`text-sm font-semibold ${notif.is_read ? 'text-slate-600' : 'text-slate-900'}`}>{notif.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.body}</p>
                </div>

                {/* Mark read */}
                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkOne(notif.id)}
                    className="flex-shrink-0 mt-0.5 text-xs text-blue-500 hover:text-blue-700 font-medium"
                    title="Mark as read"
                  >
                    <CheckCheck size={15} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
