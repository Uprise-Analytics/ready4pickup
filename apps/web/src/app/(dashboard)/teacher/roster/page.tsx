'use client'

import { useState, useMemo } from 'react'
import { useAuthStore } from '@store/auth.store'
import { useMyClassroomIds, useMyClassrooms, useTeacherRoster, useClassroomCheckins } from '@hooks/useTeacher'
import { Input } from '@components/ui/input'
import { Badge } from '@components/ui/badge'
import { Skeleton } from '@components/ui/skeleton'
import { Search, AlertTriangle, ClipboardList } from 'lucide-react'
import { getInitials, getAvatarColor } from '@utils/format'
import type { Child, ChildCheckin } from '@/types/database'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  present:         { label: 'Present',       className: 'bg-green-50 text-green-700 border-green-200' },
  picked_up:       { label: 'Picked Up',     className: 'bg-purple-50 text-purple-700 border-purple-200' },
  absent:          { label: 'Absent',        className: 'bg-red-50 text-red-700 border-red-200' },
  early_departure: { label: 'Early Out',     className: 'bg-amber-50 text-amber-700 border-amber-200' },
}

export default function TeacherRosterPage() {
  const { profile } = useAuthStore()
  const schoolId = profile?.school_id ?? null
  const [search, setSearch] = useState('')

  const { data: classroomIds = [], isLoading: clLoading } = useMyClassroomIds()
  const { data: classrooms   = [] } = useMyClassrooms(classroomIds)
  const { data: children     = [], isLoading: childrenLoading } = useTeacherRoster(schoolId, classroomIds)
  const { data: checkins     = [], isLoading: checkinsLoading } = useClassroomCheckins(schoolId, classroomIds)

  const checkinMap = useMemo(() => {
    const m = new Map<string, ChildCheckin>()
    checkins.forEach((c) => m.set(c.child_id, c))
    return m
  }, [checkins])

  const filtered = useMemo(() => {
    if (!search.trim()) return children
    const q = search.toLowerCase()
    return children.filter((c) =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.classroom ?? '').toLowerCase().includes(q)
    )
  }, [children, search])

  const isLoading = clLoading || childrenLoading || checkinsLoading

  const presentCount  = checkins.filter((c) => c.status === 'present').length
  const pickedUpCount = checkins.filter((c) => c.status === 'picked_up').length
  const notCheckedIn  = children.length - checkins.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
            <ClipboardList size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Roster</h1>
            <p className="text-sm text-slate-500">
              {classrooms[0]?.name ?? 'Your classroom'} · {children.length} child{children.length !== 1 ? 'ren' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Today's summary pills */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Present',     count: presentCount,  className: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'Picked Up',   count: pickedUpCount, className: 'bg-purple-50 text-purple-700 border-purple-200' },
          { label: 'Not Checked In', count: notCheckedIn, className: 'bg-slate-50 text-slate-600 border-slate-200' },
        ].map((s) => (
          <div key={s.label} className={`px-4 py-2 rounded-full border text-sm font-semibold ${s.className}`}>
            {s.count} {s.label}
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">{search ? 'No children match your search' : 'No children in your classroom yet'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Today's Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Classroom</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Allergies</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((child: Child) => {
                const checkin = checkinMap.get(child.id)
                const status  = checkin?.status
                const statusCfg = status ? STATUS_CONFIG[status] : null
                const name    = `${child.first_name} ${child.last_name}`
                const initials = getInitials(name)
                const color   = getAvatarColor(name)
                return (
                  <tr key={child.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {initials}
                        </div>
                        <span className="font-medium text-slate-800">{name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {statusCfg ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Not checked in</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{child.classroom ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">
                      {child.allergies && child.allergies.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <AlertTriangle size={12} className="text-amber-500" />
                          <span className="text-xs text-amber-700">{child.allergies.join(', ')}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {child.wears_diapers && <Badge variant="outline" className="text-xs py-0">🩱 Diapers</Badge>}
                        {child.drinks_bottle && <Badge variant="outline" className="text-xs py-0">🍼 Bottle</Badge>}
                        {child.medical_notes && <Badge variant="outline" className="text-xs py-0 border-amber-300 text-amber-700">⚕️ Medical</Badge>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
