import { create } from 'zustand'
import type { PickupRequest, ActivePickup } from '@/types/database'

interface ETAOption {
  label: string
  minutes: number
}

interface PickupStore {
  activePickups: ActivePickup[]
  selectedChildId: string | null
  selectedCollectorId: string | null
  etaSelection: ETAOption | null
  isRequestingPickup: boolean
  lastCompletedPickup: PickupRequest | null

  setActivePickups: (pickups: ActivePickup[]) => void
  upsertPickup: (pickup: ActivePickup) => void
  removePickup: (id: string) => void
  setSelectedChild: (childId: string | null) => void
  setSelectedCollector: (collectorId: string | null) => void
  setEta: (eta: ETAOption | null) => void
  setRequestingPickup: (loading: boolean) => void
  setLastCompleted: (pickup: PickupRequest | null) => void
  reset: () => void
}

export const usePickupStore = create<PickupStore>((set, get) => ({
  activePickups: [],
  selectedChildId: null,
  selectedCollectorId: null,
  etaSelection: null,
  isRequestingPickup: false,
  lastCompletedPickup: null,

  setActivePickups: (pickups) => set({ activePickups: pickups }),

  upsertPickup: (pickup) => {
    const existing = get().activePickups
    const idx = existing.findIndex((p) => p.id === pickup.id)
    if (idx === -1) {
      set({ activePickups: [...existing, pickup] })
    } else {
      const updated = [...existing]
      updated[idx] = pickup
      set({ activePickups: updated })
    }
  },

  removePickup: (id) =>
    set((state) => ({
      activePickups: state.activePickups.filter((p) => p.id !== id),
    })),

  setSelectedChild: (childId) => set({ selectedChildId: childId }),
  setSelectedCollector: (collectorId) => set({ selectedCollectorId: collectorId }),
  setEta: (eta) => set({ etaSelection: eta }),
  setRequestingPickup: (loading) => set({ isRequestingPickup: loading }),
  setLastCompleted: (pickup) => set({ lastCompletedPickup: pickup }),

  reset: () =>
    set({
      selectedChildId: null,
      selectedCollectorId: null,
      etaSelection: null,
      isRequestingPickup: false,
    }),
}))
