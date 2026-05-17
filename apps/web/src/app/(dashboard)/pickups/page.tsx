'use client'

import { PickupBoard } from '@components/pickups/PickupBoard'
import { Truck } from 'lucide-react'

export default function PickupsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Truck size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Live Pickups</h1>
          <p className="text-sm text-slate-500">Real-time view of active pickups</p>
        </div>
        <span className="ml-2 w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
      </div>

      <PickupBoard />
    </div>
  )
}
