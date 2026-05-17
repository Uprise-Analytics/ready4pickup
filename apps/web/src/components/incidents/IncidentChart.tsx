'use client'

import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { subDays, subMonths, format, parseISO, startOfDay, startOfWeek, startOfMonth } from 'date-fns'
import { Button } from '@components/ui/button'
import type { IncidentWithDetails } from '@hooks/useSchoolAdmin'

type Range = '7d' | '30d' | '12m'

function buildChartData(incidents: IncidentWithDetails[], range: Range) {
  const now = new Date()
  let buckets: { label: string; from: Date; to: Date }[] = []

  if (range === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i)
      buckets.push({ label: format(d, 'EEE'), from: startOfDay(d), to: startOfDay(subDays(d, -1)) })
    }
  } else if (range === '30d') {
    for (let i = 29; i >= 0; i--) {
      const d = subDays(now, i)
      buckets.push({ label: format(d, 'd'), from: startOfDay(d), to: startOfDay(subDays(d, -1)) })
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i)
      buckets.push({ label: format(d, 'MMM'), from: startOfMonth(d), to: startOfMonth(subMonths(d, -1)) })
    }
  }

  return buckets.map(({ label, from, to }) => {
    const slice = incidents.filter((inc) => {
      const t = parseISO(inc.occurred_at)
      return t >= from && t < to
    })
    return {
      label,
      low: slice.filter((i) => i.severity === 'low').length,
      medium: slice.filter((i) => i.severity === 'medium').length,
      high: slice.filter((i) => i.severity === 'high').length,
      critical: slice.filter((i) => i.severity === 'critical').length,
    }
  })
}

interface Props {
  incidents: IncidentWithDetails[]
}

export function IncidentChart({ incidents }: Props) {
  const [range, setRange] = useState<Range>('30d')
  const data = useMemo(() => buildChartData(incidents, range), [incidents, range])

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Incident Trend</h3>
        <div className="flex gap-1">
          {(['7d', '30d', '12m'] as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? 'default' : 'ghost'}
              className="text-xs h-7 px-2"
              onClick={() => setRange(r)}
            >
              {r === '7d' ? '7 days' : r === '30d' ? '30 days' : '12 months'}
            </Button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            cursor={{ fill: '#f8fafc' }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="low"      stackId="a" fill="#22c55e" name="Low"      radius={[0, 0, 0, 0]} />
          <Bar dataKey="medium"   stackId="a" fill="#f59e0b" name="Medium"   radius={[0, 0, 0, 0]} />
          <Bar dataKey="high"     stackId="a" fill="#ef4444" name="High"     radius={[0, 0, 0, 0]} />
          <Bar dataKey="critical" stackId="a" fill="#7f1d1d" name="Critical" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
