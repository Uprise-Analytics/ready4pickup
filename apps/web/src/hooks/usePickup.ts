import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, rpc } from '@lib/supabase'
import { queryKeys } from '@lib/query-client'
import { useAuth } from '@hooks/useAuth'
import type { ActivePickup, PickupRequestWithDetails } from '@/types/database'

export function useActivePickups(schoolId?: string) {
  const { schoolId: mySchoolId } = useAuth()
  const targetSchoolId = schoolId ?? mySchoolId

  return useQuery({
    queryKey: queryKeys.pickups.active(targetSchoolId ?? ''),
    enabled: !!targetSchoolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pickup_requests')
        .select(`
          *,
          child:children(id, first_name, last_name, avatar_url, classroom, allergies),
          collector:profiles!collector_id(id, full_name, avatar_url, phone),
          checkin:child_checkins(*)
        `)
        .eq('school_id', targetSchoolId!)
        .in('status', ['on_the_way', 'arrived', 'preparing'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as unknown as ActivePickup[]
    },
    refetchInterval: 60 * 1000,
  })
}

export function usePickupHistory(params: {
  childId?: string
  userId?: string
  schoolId?: string
  limit?: number
}) {
  return useQuery({
    queryKey: queryKeys.pickups.history(params),
    queryFn: async () => {
      let query = supabase
        .from('pickup_requests')
        .select(`
          *,
          child:children(id, first_name, last_name, avatar_url, classroom),
          collector:profiles!collector_id(id, full_name, avatar_url),
          requested_by_profile:profiles!requested_by(id, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(params.limit ?? 100)

      if (params.childId)  query = query.eq('child_id', params.childId)
      if (params.schoolId) query = query.eq('school_id', params.schoolId)
      if (params.userId)   query = query.or(`requested_by.eq.${params.userId},collector_id.eq.${params.userId}`)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as PickupRequestWithDetails[]
    },
  })
}

export function useCancelPickup() {
  const qc = useQueryClient()
  const { userId, schoolId } = useAuth()

  return useMutation({
    mutationFn: async ({ pickupRequestId, reason }: { pickupRequestId: string; reason?: string }) => {
      const { data, error } = await rpc.cancelPickup(pickupRequestId, userId!, reason)
      if (error) throw error
      const result = data as { success: boolean; message: string }
      if (!result.success) throw new Error(result.message)
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pickups.active(schoolId ?? '') })
    },
  })
}
