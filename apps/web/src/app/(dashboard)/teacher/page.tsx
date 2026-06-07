'use client'

import Link from 'next/link'
import { useAuthStore } from '@store/auth.store'
import { useMyClassroomIds, useMyClassrooms, useTeacherRoster, useClassroomCheckins, useMyNotifications } from '@hooks/useTeacher'
import { useTodaysDuties } from '@hooks/useDuties'
import { useSchoolIncidents } from '@hooks/useSchoolAdmin'
import { ClipboardList, Package, Archive, AlertTriangle, Bell, Users, CheckCircle, Car, BellRing, CalendarCheck, MapPin, Clock } from 'lucide-react'
import { Skeleton } from '@components/ui/skeleton'

function StatCard({ label, value, icon: Icon, color, isLoading }: {
  label: string; value: number | undefined; icon: React.ElementType; color: string; isLoading: boolean
}) {
  const colorMap: Record<string, string> = {
    teal:   'bg-teal-50 text-teal-600 border-teal-100',
    green:  'bg-green-50 text-green-600 border-green-100',
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
    red:    'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  }
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] ?? colorMap.teal}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium opacity-80">{label}</p>
        <Icon size={18} className="opacity-60" />
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <p className="text-3xl font-bold">{value ?? 0}</p>
      )}
    </div>
  )
}

const QUICK_LINKS = [
  { href: '/teacher/roster',        label: 'My Roster',    desc: 'View children in your class', icon: ClipboardList,  color: 'bg-teal-500' },
  { href: '/teacher/supplies',      label: 'Supplies',     desc: 'Manage class supply levels',   icon: Package,        color: 'bg-purple-500' },
  { href: '/teacher/inventory',     label: 'Inventory',    desc: 'Items, stock takes & events',  icon: Archive,        color: 'bg-blue-500' },
  { href: '/teacher/incidents',     label: 'Incidents',    desc: 'Report or view incidents',     icon: AlertTriangle,  color: 'bg-amber-500' },
  { href: '/teacher/notifications', label: 'Notifications',desc: 'Your notification history',    icon: Bell,           color: 'bg-pink-500' },
  { href: '/teacher/duties',        label: 'Duties',       desc: 'Your supervision schedule',    icon: CalendarCheck,  color: 'bg-indigo-500' },
]

export default function TeacherDashboard() {
  const { profile } = useAuthStore()
  const schoolId = profile?.school_id ?? null
  const userId   = profile?.id ?? null

  const { data: classroomIds = [], isLoading: classroomLoading } = useMyClassroomIds()
  const { data: classrooms   = [] } = useMyClassrooms(classroomIds)
  const { data: children     = [], isLoading: childrenLoading } = useTeacherRoster(schoolId, classroomIds)
  const { data: checkins     = [], isLoading: checkinsLoading } = useClassroomCheckins(schoolId, classroomIds)
  const { data: incidents    = [] } = useSchoolIncidents(schoolId)
  const { data: notifications = [] } = useMyNotifications(userId)
  const { data: todaysDuties = [] } = useTodaysDuties(userId)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Teacher'
  const classroomName = classrooms[0]?.name ?? 'your classroom'

  const presentCount  = checkins.filter((c) => c.status === 'present').length
  const pickupCount   = checkins.filter((c) => ['picked_up'].includes(c.status)).length
  const onTheWayCount = checkins.filter((c) => c.status === 'present').length  // approximate active pickups
  const openIncidents = incidents.filter((i) => !i.is_resolved).length
  const unreadCount   = notifications.filter((n) => !n.is_read).length

  const isLoading = classroomLoading || childrenLoading || checkinsLoading

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {classroomLoading ? 'Loading…' : `${classroomName} · ${new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Children in Class"  value={children.length} icon={Users}        color="teal"   isLoading={isLoading} />
        <StatCard label="Present Today"      value={presentCount}    icon={CheckCircle}  color="green"  isLoading={isLoading} />
        <StatCard label="Picked Up Today"    value={pickupCount}     icon={Car}          color="blue"   isLoading={isLoading} />
        <StatCard label="Open Incidents"     value={openIncidents}   icon={AlertTriangle}color={openIncidents > 0 ? 'red' : 'teal'} isLoading={false} />
      </div>

      {/* Unread notifications banner */}
      {unreadCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <BellRing size={18} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium flex-1">
            You have <span className="font-bold">{unreadCount}</span> unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
          <Link href="/teacher/notifications" className="text-xs text-amber-700 font-semibold underline underline-offset-2">
            View all
          </Link>
        </div>
      )}

      {/* Today's duties banner */}
      {todaysDuties.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <CalendarCheck size={18} className="text-indigo-600 flex-shrink-0" />
            <p className="text-sm text-indigo-800 font-semibold flex-1">
              📅 You are on duty today
            </p>
            <Link href="/teacher/duties" className="text-xs text-indigo-700 font-semibold underline underline-offset-2">
              View all
            </Link>
          </div>
          {todaysDuties.map((d) => (
            <div key={d.id} className="ml-7 flex items-center gap-3 text-sm text-indigo-700">
              <MapPin size={13} className="flex-shrink-0" />
              <span className="font-medium">{d.location?.name}</span>
              <Clock size={12} className="flex-shrink-0 text-indigo-400" />
              <span className="text-indigo-500">
                {(() => {
                  const fmt = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` }
                  return `${fmt(d.start_time)} – ${fmt(d.end_time)}`
                })()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Quick Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className={`w-10 h-10 ${link.color} rounded-lg flex items-center justify-center mb-3`}>
                <link.icon size={20} className="text-white" />
              </div>
              <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900">{link.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* No classroom assigned */}
      {!classroomLoading && classroomIds.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
          <p className="font-semibold text-amber-800">No classroom assigned</p>
          <p className="text-sm text-amber-700 mt-1">Ask your school admin to assign you to a classroom to get started.</p>
        </div>
      )}
    </div>
  )
}
