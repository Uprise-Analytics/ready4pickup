import { useEffect, useRef, useState } from 'react'
import { supabase } from '@lib/supabase'
import { usePickupStore } from '@store/pickup.store'
import type { ActivePickup, PickupRequest, PickupStatus } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UsePickupRealtimeOptions {
  schoolId?: string
  childId?: string
  onUpdate?: (pickup: ActivePickup) => void
  onNew?: (pickup: ActivePickup) => void
  onCompleted?: (pickup: ActivePickup) => void
  enabled?: boolean
}

interface UsePickupRealtimeResult {
  activePickups: ActivePickup[]
  isSubscribed: boolean
}

export function usePickupRealtime({
  schoolId,
  childId,
  onUpdate,
  onNew,
  onCompleted,
  enabled = true,
}: UsePickupRealtimeOptions): UsePickupRealtimeResult {
  const { activePickups, setActivePickups, upsertPickup, removePickup } = usePickupStore()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if (!enabled || (!schoolId && !childId)) return

    let filter = ''
    if (schoolId) filter = `school_id=eq.${schoolId}`
    else if (childId) filter = `child_id=eq.${childId}`

    const channelName = `pickups:${schoolId ?? childId}`

    const stale = supabase.getChannels().find((ch) => ch.topic === `realtime:${channelName}`)
    if (stale) supabase.removeChannel(stale)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_requests', filter },
        async (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload

          if (eventType === 'INSERT') {
            const full = await fetchPickupDetails(newRow.id as string)
            if (full) { upsertPickup(full); onNew?.(full) }
          } else if (eventType === 'UPDATE') {
            const updated = newRow as PickupRequest
            const TERMINAL: PickupStatus[] = ['completed', 'cancelled', 'expired']
            if (TERMINAL.includes(updated.status)) {
              const existing = activePickups.find((p) => p.id === updated.id)
              removePickup(updated.id)
              if (existing && updated.status === 'completed') {
                onCompleted?.({ ...existing, ...updated })
              }
            } else {
              const full = await fetchPickupDetails(updated.id)
              if (full) { upsertPickup(full); onUpdate?.(full) }
            }
          } else if (eventType === 'DELETE') {
            removePickup((oldRow as PickupRequest).id)
          }
        }
      )
      .on('system', { event: 'close' } as any, () => setIsSubscribed(false))
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      setIsSubscribed(false)
    }
  }, [schoolId, childId, enabled])

  return { activePickups, isSubscribed }
}

async function fetchPickupDetails(pickupRequestId: string): Promise<ActivePickup | null> {
  const { data, error } = await supabase
    .from('pickup_requests')
    .select(`
      *,
      child:children(id, first_name, last_name, avatar_url, classroom, allergies),
      collector:profiles!collector_id(id, full_name, avatar_url, phone),
      checkin:child_checkins(*)
    `)
    .eq('id', pickupRequestId)
    .single()

  if (error || !data) return null
  return data as unknown as ActivePickup
}
