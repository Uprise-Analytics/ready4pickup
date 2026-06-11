'use client'

import { format, parseISO, isToday } from 'date-fns'
import { useAuthStore } from '@store/auth.store'
import { useMyDuties } from '@hooks/useDuties'
import { CalendarCheck, MapPin, Clock } from 'lucide-react'

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${period}`
}

export default function TeacherDutiesPage() {
  const { profile } = useAuthStore()
  const { data: duties = [], isLoading } = useMyDuties(profile?.id ?? null)

  const todayDuties = duties.filter((d) => isToday(parseISO(d.duty_date)))
  const upcomingDuties = duties.filter((d) => !isToday(parseISO(d.duty_date)))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarCheck size={24} className="text-teal-600" />
          My Duties
        </h1>
        <p className="text-sm text-slate-500 mt-1">Your upcoming supervision and playground duties</p>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading duties…</div>
      ) : duties.length === 0 ? (
        <div className="text-center py-20">
          <CalendarCheck size={44} className="text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-600 text-lg">No duties scheduled</p>
          <p className="text-sm text-slate-400 mt-1">Your school admin will assign supervision duties here</p>
        </div>
      ) : (
        <>
          {/* Today's duties */}
          {todayDuties.length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">⚡ On Duty Today</p>
              <div className="space-y-3">
                {todayDuties.map((d) => (
                  <div key={d.id} className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin size={18} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800">{d.location?.name ?? 'Duty'}</p>
                      <p className="text-sm text-amber-700 flex items-center gap-1 mt-0.5">
                        <Clock size={12} />
                        {formatTime(d.start_time)} – {formatTime(d.end_time)}
                      </p>
                      {d.notes && <p className="text-xs text-slate-500 italic mt-1">{d.notes}</p>}
                    </div>
                    <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0">TODAY</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming duties */}
          {upcomingDuties.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">📅 Upcoming</p>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Location</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Time</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingDuties.map((d) => (
                      <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {format(parseISO(d.duty_date), 'EEE, d MMM yyyy')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-teal-700">
                            <MapPin size={13} />
                            {d.location?.name ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {formatTime(d.start_time)} – {formatTime(d.end_time)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 italic max-w-xs truncate">
                          {d.notes ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
