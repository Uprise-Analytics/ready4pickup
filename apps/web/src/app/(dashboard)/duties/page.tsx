'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useAuthStore } from '@store/auth.store'
import { useDutyLocations, useDutyAssignments, useSchoolTeachers, useDeleteDutyAssignment, useDeleteDutyLocation } from '@hooks/useDuties'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import { DutyLocationDialog } from '@components/duties/DutyLocationDialog'
import { AssignDutyDialog } from '@components/duties/AssignDutyDialog'
import { CalendarCheck, MapPin, Plus, Pencil, Trash2 } from 'lucide-react'
import type { DutyLocation, DutyAssignmentWithDetails } from '@/types/database'

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${period}`
}

export default function DutiesPage() {
  const { profile } = useAuthStore()
  const schoolId = profile?.school_id ?? null
  const userId = profile?.id ?? ''

  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<DutyLocation | null>(null)
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<DutyAssignmentWithDetails | null>(null)

  const { data: locations = [], isLoading: locationsLoading } = useDutyLocations(schoolId)
  const { data: assignments = [], isLoading: assignmentsLoading } = useDutyAssignments(schoolId)
  const { data: teachers = [] } = useSchoolTeachers(schoolId)
  const { mutate: deleteAssignment } = useDeleteDutyAssignment()
  const { mutate: deleteLocation } = useDeleteDutyLocation()

  const handleDeleteAssignment = (a: DutyAssignmentWithDetails) => {
    if (!confirm(`Remove ${a.teacher?.full_name}'s duty at ${a.location?.name} on ${format(parseISO(a.duty_date), 'dd MMM yyyy')}?`)) return
    deleteAssignment({ id: a.id, schoolId: a.school_id, teacherId: a.teacher_id })
  }

  const handleDeleteLocation = (l: DutyLocation) => {
    if (!confirm(`Deactivate location "${l.name}"?`)) return
    deleteLocation({ id: l.id, schoolId: l.school_id })
  }

  const isToday = (dateStr: string) => format(new Date(), 'yyyy-MM-dd') === dateStr

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck size={24} className="text-teal-600" />
            Duty Roster
          </h1>
          <p className="text-sm text-slate-500 mt-1">Schedule teacher supervision duties and manage locations</p>
        </div>
      </div>

      <Tabs defaultValue="assignments">
        <TabsList>
          <TabsTrigger value="assignments">📋 Assignments</TabsTrigger>
          <TabsTrigger value="locations">📍 Locations</TabsTrigger>
        </TabsList>

        {/* ── Assignments tab ── */}
        <TabsContent value="assignments" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => { setEditingAssignment(null); setAssignmentDialogOpen(true) }}
              className="gap-2"
            >
              <Plus size={16} /> Assign Duty
            </Button>
          </div>

          {assignmentsLoading ? (
            <div className="text-center py-16 text-slate-400">Loading assignments…</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-16">
              <CalendarCheck size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600">No duties assigned yet</p>
              <p className="text-sm text-slate-400 mt-1">Click "Assign Duty" to get started</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Teacher</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Location</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Time</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Notes</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${isToday(a.duty_date) ? 'bg-amber-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{format(parseISO(a.duty_date), 'EEE, d MMM yyyy')}</div>
                        {isToday(a.duty_date) && <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 mt-0.5">Today</Badge>}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{a.teacher?.full_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-teal-700">
                          <MapPin size={13} />{a.location?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatTime(a.start_time)} – {formatTime(a.end_time)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 italic max-w-xs truncate">{a.notes ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setEditingAssignment(a); setAssignmentDialogOpen(true) }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(a)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Locations tab ── */}
        <TabsContent value="locations" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => { setEditingLocation(null); setLocationDialogOpen(true) }}
              className="gap-2"
            >
              <Plus size={16} /> Add Location
            </Button>
          </div>

          {locationsLoading ? (
            <div className="text-center py-16 text-slate-400">Loading locations…</div>
          ) : locations.length === 0 ? (
            <div className="text-center py-16">
              <MapPin size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600">No locations yet</p>
              <p className="text-sm text-slate-400 mt-1">Create locations like "Playground" before assigning duties</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Description</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {locations.map((l) => (
                    <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800 flex items-center gap-1.5">
                        <MapPin size={14} className="text-teal-500 flex-shrink-0" />{l.name}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{l.description ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge className={l.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500'}>
                          {l.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setEditingLocation(l); setLocationDialogOpen(true) }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(l)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DutyLocationDialog
        open={locationDialogOpen}
        onClose={() => { setLocationDialogOpen(false); setEditingLocation(null) }}
        schoolId={schoolId ?? ''}
        userId={userId}
        initial={editingLocation}
      />

      <AssignDutyDialog
        open={assignmentDialogOpen}
        onClose={() => { setAssignmentDialogOpen(false); setEditingAssignment(null) }}
        schoolId={schoolId ?? ''}
        userId={userId}
        locations={locations}
        teachers={teachers}
        initial={editingAssignment}
      />
    </div>
  )
}
