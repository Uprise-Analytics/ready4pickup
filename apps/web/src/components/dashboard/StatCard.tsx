import { Card, CardContent } from '@components/ui/card'
import { Skeleton } from '@components/ui/skeleton'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string | undefined
  icon: LucideIcon
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate'
  isLoading?: boolean
}

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   value: 'text-blue-700' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  value: 'text-green-700' },
  amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  value: 'text-amber-700' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',    value: 'text-red-700' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', value: 'text-purple-700' },
  slate:  { bg: 'bg-slate-50',  icon: 'text-slate-600',  value: 'text-slate-700' },
}

export function StatCard({ label, value, icon: Icon, color = 'blue', isLoading }: StatCardProps) {
  const c = COLOR_MAP[color]
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">{label}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className={`text-3xl font-bold mt-1 ${c.value}`}>{value ?? '—'}</p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={22} className={c.icon} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
