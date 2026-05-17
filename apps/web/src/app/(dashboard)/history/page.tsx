'use client'

import { useAuthStore } from '@store/auth.store'
import { usePickupHistory } from '@hooks/usePickup'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@components/ui/table'
import { Skeleton } from '@components/ui/skeleton'
import { formatDateTime } from '@utils/format'
import { History } from 'lucide-react'
import { useState } from 'react'
import { Search } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
  expired: 'bg-slate-100 text-slate-500',
}

export default function HistoryPage() {
  const [search, setSearch] = useState('')
  const profile = useAuthStore((s) => s.profile)
  const schoolId = profile?.school_id ?? ''

  const { data: history = [], isLoading } = usePickupHistory({ schoolId, limit: 200 })

  const filtered = history.filter((p) => {
    if (!search) return true
    const childName = `${p.child.first_name} ${p.child.last_name}`.toLowerCase()
    const collectorName = p.collector.full_name.toLowerCase()
    return childName.includes(search.toLowerCase()) || collectorName.includes(search.toLowerCase())
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
          <History size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pickup History</h1>
          <p className="text-sm text-slate-500">Last 200 pickups</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input className="pl-8 h-8 text-sm" placeholder="Search by child or collector…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Child</TableHead>
                <TableHead>Collector</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-10">No history found</TableCell>
                </TableRow>
              ) : (
                filtered.map((pickup) => (
                  <TableRow key={pickup.id}>
                    <TableCell className="font-medium text-slate-800 text-sm">
                      {pickup.child.first_name} {pickup.child.last_name}
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">{pickup.collector.full_name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[pickup.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {pickup.status.charAt(0).toUpperCase() + pickup.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm whitespace-nowrap">{formatDateTime(pickup.created_at)}</TableCell>
                    <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                      {pickup.completed_at ? formatDateTime(pickup.completed_at) : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
