'use client'

import { useState } from 'react'
import { Badge } from '@components/ui/badge'
import { Input } from '@components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@components/ui/table'
import type { IncidentWithDetails } from '@hooks/useSchoolAdmin'
import { formatDateTime } from '@utils/format'
import { Search, ChevronRight } from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  low:      'bg-green-100 text-green-700 border-green-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  high:     'bg-red-100 text-red-700 border-red-200',
  critical: 'bg-red-900 text-white border-red-900',
}

const CATEGORY_LABELS: Record<string, string> = {
  injury: 'Injury', behavioral: 'Behavioral', medical: 'Medical',
  safety: 'Safety', property: 'Property', other: 'Other',
}

interface Props {
  incidents: IncidentWithDetails[]
  onSelect: (incident: IncidentWithDetails) => void
}

export function IncidentTable({ incidents, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterResolved, setFilterResolved] = useState<string>('all')

  const filtered = incidents.filter((inc) => {
    const matchSearch = !search
      || inc.title.toLowerCase().includes(search.toLowerCase())
      || (inc.reporter?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchSeverity = filterSeverity === 'all' || inc.severity === filterSeverity
    const matchResolved =
      filterResolved === 'all' ||
      (filterResolved === 'open' && !inc.is_resolved) ||
      (filterResolved === 'resolved' && inc.is_resolved)
    return matchSearch && matchSeverity && matchResolved
  })

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search incidents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="all">All severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select
            className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white"
            value={filterResolved}
            onChange={(e) => setFilterResolved(e.target.value)}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Reporter</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-slate-400 py-10">
                No incidents found
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((inc) => (
              <TableRow
                key={inc.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => onSelect(inc)}
              >
                <TableCell className="font-medium text-slate-800 max-w-[220px]">
                  <p className="truncate">{inc.title}</p>
                  {inc.child && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {inc.child.first_name} {inc.child.last_name}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${SEVERITY_COLORS[inc.severity]}`}>
                    {inc.severity.charAt(0).toUpperCase() + inc.severity.slice(1)}
                  </span>
                </TableCell>
                <TableCell className="text-slate-600 text-sm">{CATEGORY_LABELS[inc.category] ?? inc.category}</TableCell>
                <TableCell className="text-slate-600 text-sm">{inc.reporter?.full_name ?? '—'}</TableCell>
                <TableCell className="text-slate-500 text-sm whitespace-nowrap">{formatDateTime(inc.occurred_at)}</TableCell>
                <TableCell>
                  {inc.is_resolved ? (
                    <Badge className="text-xs bg-green-50 text-green-700">Resolved</Badge>
                  ) : (
                    <Badge className="text-xs bg-amber-50 text-amber-700 border border-amber-200">Open</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <ChevronRight size={16} className="text-slate-300" />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
