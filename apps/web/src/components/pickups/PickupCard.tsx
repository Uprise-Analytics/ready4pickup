import { Badge } from '@components/ui/badge'
import { formatRelativeTime, getInitials, getAvatarColor } from '@utils/format'
import type { ActivePickup } from '@/types/database'
import { Clock, AlertTriangle } from 'lucide-react'

interface PickupCardProps {
  pickup: ActivePickup
}

const STATUS_LABELS: Record<string, string> = {
  on_the_way: 'On The Way',
  arrived: 'Arrived',
  preparing: 'Preparing',
}

export function PickupCard({ pickup }: PickupCardProps) {
  const childName = `${pickup.child.first_name} ${pickup.child.last_name}`
  const collectorInitials = getInitials(pickup.collector.full_name)
  const avatarColor = getAvatarColor(pickup.collector.full_name)
  const hasAllergies = pickup.child.allergies && pickup.child.allergies.length > 0

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900 text-sm leading-tight">{childName}</p>
          {pickup.child.classroom && (
            <p className="text-xs text-slate-400 mt-0.5">{pickup.child.classroom}</p>
          )}
        </div>
        {hasAllergies && (
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
        )}
      </div>

      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: avatarColor }}
        >
          {collectorInitials}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-700 truncate">{pickup.collector.full_name}</p>
          {pickup.collector.phone && (
            <p className="text-xs text-slate-400">{pickup.collector.phone}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Clock size={12} />
          <span>{formatRelativeTime(pickup.on_the_way_at)}</span>
        </div>
        {pickup.eta_minutes && (
          <Badge variant="secondary" className="text-xs">
            ETA {pickup.eta_minutes} min
          </Badge>
        )}
      </div>

      <p className="text-xs font-mono text-slate-500 bg-slate-50 rounded px-2 py-1">
        PIN: {pickup.pickup_pin}
      </p>
    </div>
  )
}
