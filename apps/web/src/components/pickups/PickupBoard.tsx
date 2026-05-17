'use client'

import { useAuthStore } from '@store/auth.store'
import { useActivePickups } from '@hooks/usePickup'
import { usePickupRealtime } from '@hooks/usePickupRealtime'
import { PickupCard } from './PickupCard'
import { Skeleton } from '@components/ui/skeleton'
import type { ActivePickup } from '@/types/database'
import { Truck, MapPin, Package } from 'lucide-react'

const COLUMNS: { status: string; label: string; icon: React.ReactNode; color: string }[] = [
  { status: 'on_the_way', label: 'On The Way',  icon: <Truck size={16} />,   color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { status: 'arrived',    label: 'Arrived',     icon: <MapPin size={16} />,  color: 'text-green-600 bg-green-50 border-green-200' },
  { status: 'preparing',  label: 'Preparing',   icon: <Package size={16} />, color: 'text-amber-600 bg-amber-50 border-amber-200' },
]

export function PickupBoard() {
  const profile = useAuthStore((s) => s.profile)
  const schoolId = profile?.school_id ?? undefined
  const { data: pickups = [], isLoading } = useActivePickups(schoolId)
  usePickupRealtime({ schoolId: schoolId ?? undefined })

  const byStatus = (status: string) => pickups.filter((p: ActivePickup) => p.status === status)

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.status} className="space-y-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => {
        const items = byStatus(col.status)
        return (
          <div key={col.status} className="flex flex-col gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-medium text-sm ${col.color}`}>
              {col.icon}
              <span>{col.label}</span>
              <span className="ml-auto font-bold">{items.length}</span>
            </div>

            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                <p className="text-sm text-slate-400">No pickups</p>
              </div>
            ) : (
              items.map((pickup: ActivePickup) => (
                <PickupCard key={pickup.id} pickup={pickup} />
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}
