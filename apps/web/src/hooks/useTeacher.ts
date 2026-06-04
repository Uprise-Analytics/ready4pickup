import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db, rpc, supabase } from '@lib/supabase'
import { queryKeys } from '@lib/query-client'
import type {
  Child, ChildCheckin, ConsumableType, ChildConsumableStock, StockLevel,
  InventoryItem, InventoryEvent, StockTake, StockTakeItem,
  InventoryCategory, InventoryCondition, StockTakeCondition, InventoryEventType,
  InventoryLoan,
} from '@/types/database'

// ── Classroom IDs for this teacher ───────────────────────────────────────────

export function useMyClassroomIds() {
  return useQuery({
    queryKey: queryKeys.teacher.classroomIds,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await rpc.getMyClassroomIds()
      if (error) throw error
      return (data ?? []).map((a: any) => a.classroom_id as string)
    },
  })
}

export function useMyClassrooms(classroomIds: string[]) {
  return useQuery({
    queryKey: ['teacher', 'classrooms', ...classroomIds],
    enabled: classroomIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await db.classrooms()
        .select('*')
        .in('id', classroomIds)
      if (error) throw error
      return (data ?? []) as { id: string; name: string; color: string; is_baby_class: boolean }[]
    },
  })
}

// ── Roster ────────────────────────────────────────────────────────────────────

export function useTeacherRoster(schoolId: string | null, classroomIds: string[]) {
  return useQuery({
    queryKey: queryKeys.teacher.roster(schoolId ?? ''),
    enabled: !!schoolId && classroomIds.length > 0,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await db.children()
        .select('*')
        .eq('school_id', schoolId!)
        .in('classroom_id', classroomIds)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('last_name')
        .order('first_name')
      if (error) throw error
      return (data ?? []) as Child[]
    },
  })
}

export function useClassroomCheckins(schoolId: string | null, classroomIds: string[]) {
  const today = new Date().toISOString().split('T')[0]
  return useQuery({
    queryKey: queryKeys.teacher.checkins(today),
    enabled: !!schoolId && classroomIds.length > 0,
    staleTime: 30 * 1000,
    refetchInterval: 30_000,
    queryFn: async () => {
      // Get child IDs in classroom first
      const { data: children } = await db.children()
        .select('id')
        .eq('school_id', schoolId!)
        .in('classroom_id', classroomIds)
        .eq('is_active', true)
        .is('deleted_at', null)
      const childIds = (children ?? []).map((c: any) => c.id)
      if (!childIds.length) return [] as ChildCheckin[]

      const { data, error } = await db.childCheckins()
        .select('*')
        .in('child_id', childIds)
        .eq('date', today)
      if (error) throw error
      return (data ?? []) as ChildCheckin[]
    },
  })
}

// ── Supplies (consumables) ────────────────────────────────────────────────────

export function useClassroomConsumableTypes(classroomId: string | null) {
  return useQuery({
    queryKey: queryKeys.consumables.types(classroomId ?? ''),
    enabled: !!classroomId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await db.consumableTypes()
        .select('*')
        .eq('classroom_id', classroomId!)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as ConsumableType[]
    },
  })
}

export function useCreateConsumableType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { schoolId: string; classroomId: string; name: string; emoji: string; createdBy: string }) => {
      const { data, error } = await db.consumableTypes()
        .insert({ school_id: input.schoolId, classroom_id: input.classroomId, name: input.name, emoji: input.emoji, created_by: input.createdBy })
        .select().single()
      if (error) throw error
      return data as ConsumableType
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: queryKeys.consumables.types(data.classroom_id ?? '') }),
  })
}

export function useChildConsumableStock(childId: string | null) {
  return useQuery({
    queryKey: queryKeys.consumables.childStock(childId ?? ''),
    enabled: !!childId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await db.childConsumableStock()
        .select('*, consumable_type:consumable_types(id, name, emoji)')
        .eq('child_id', childId!)
      if (error) throw error
      return (data ?? []) as (ChildConsumableStock & { consumable_type: Pick<ConsumableType, 'id' | 'name' | 'emoji'> })[]
    },
  })
}

export function useUpsertChildStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { childId: string; schoolId: string; consumableTypeId: string; stockLevel: StockLevel; updatedBy: string }) => {
      const { data, error } = await db.childConsumableStock()
        .upsert({
          child_id: input.childId, school_id: input.schoolId,
          consumable_type_id: input.consumableTypeId, stock_level: input.stockLevel,
          updated_by: input.updatedBy, updated_at: new Date().toISOString(),
        }, { onConflict: 'child_id,consumable_type_id' })
        .select().single()
      if (error) throw error
      return data as ChildConsumableStock
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: queryKeys.consumables.childStock(data.child_id) }),
  })
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export function useClassroomInventory(classroomId: string | null) {
  return useQuery({
    queryKey: queryKeys.inventory.classroom(classroomId ?? ''),
    enabled: !!classroomId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await db.inventoryItems()
        .select('*')
        .eq('classroom_id', classroomId!)
        .eq('is_active', true)
        .order('category')
        .order('name')
      if (error) throw error
      return (data ?? []) as InventoryItem[]
    },
  })
}

export function useCreateInventoryEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { schoolId: string; itemId: string | null; classroomId: string; eventType: InventoryEventType; description?: string; qty?: number; targetClassroomId?: string | null; reportedBy: string }) => {
      const { data, error } = await db.inventoryEvents()
        .insert({
          school_id: input.schoolId, item_id: input.itemId ?? null,
          classroom_id: input.classroomId, event_type: input.eventType,
          description: input.description ?? null, qty: input.qty ?? 1,
          target_classroom_id: input.targetClassroomId ?? null,
          reported_by: input.reportedBy,
        })
        .select().single()
      if (error) throw error
      return data as InventoryEvent
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: queryKeys.inventory.events(data.school_id) }),
  })
}

export function useSubmitStockTake() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { schoolId: string; classroomId: string; submittedBy: string; notes?: string; items: Array<{ itemId: string; expectedQty: number; actualQty: number; condition: StockTakeCondition; notes?: string }> }) => {
      const { data: stockTake, error: takeError } = await db.stockTakes()
        .insert({ school_id: input.schoolId, classroom_id: input.classroomId, submitted_by: input.submittedBy, notes: input.notes ?? null })
        .select().single()
      if (takeError) throw takeError
      if (input.items.length > 0) {
        const { error: itemsError } = await db.stockTakeItems()
          .insert(input.items.map((i) => ({ stock_take_id: stockTake.id, item_id: i.itemId, expected_qty: i.expectedQty, actual_qty: i.actualQty, condition: i.condition, notes: i.notes ?? null })))
        if (itemsError) throw itemsError
      }
      return stockTake as StockTake
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: queryKeys.inventory.stockTakes(data.submitted_by) }),
  })
}

export function useMyStockTakes(submittedBy: string | null) {
  return useQuery({
    queryKey: queryKeys.inventory.stockTakes(submittedBy ?? ''),
    enabled: !!submittedBy,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await db.stockTakes()
        .select('*, classroom:classrooms(id, name)')
        .eq('submitted_by', submittedBy!)
        .order('submitted_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as (StockTake & { classroom: { id: string; name: string } })[]
    },
  })
}

export function useStockTakeItems(stockTakeId: string | null) {
  return useQuery({
    queryKey: ['inventory', 'stock-take-items', stockTakeId ?? ''],
    enabled: !!stockTakeId,
    queryFn: async () => {
      const { data, error } = await db.stockTakeItems()
        .select('*, item:inventory_items(id, name, category, serial_number, quantity)')
        .eq('stock_take_id', stockTakeId!)
      if (error) throw error
      return (data ?? []) as (StockTakeItem & { item: Pick<InventoryItem, 'id' | 'name' | 'category' | 'serial_number' | 'quantity'> })[]
    },
  })
}

export function useClassroomInventoryEvents(classroomId: string | null) {
  return useQuery({
    queryKey: queryKeys.inventory.events(classroomId ?? ''),
    enabled: !!classroomId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await db.inventoryEvents()
        .select('*, item:inventory_items(id, name, category), target:classrooms!target_classroom_id(id, name), reporter:profiles!reported_by(id, full_name)')
        .eq('classroom_id', classroomId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as (InventoryEvent & {
        item: Pick<InventoryItem, 'id' | 'name' | 'category'> | null
        target: { id: string; name: string } | null
        reporter: { id: string; full_name: string } | null
      })[]
    },
  })
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function useMyNotifications(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.notifications.mine(userId ?? ''),
    enabled: !!userId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await db.notifications()
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return (data ?? []) as { id: string; user_id: string; school_id: string | null; type: string; title: string; body: string; data: Record<string, unknown>; is_read: boolean; read_at: string | null; created_at: string }[]
    },
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; userId: string }) => {
      const { error } = await db.notifications()
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('user_id', input.userId)
      if (error) throw error
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: queryKeys.notifications.mine(vars.userId) }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await db.notifications()
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false)
      if (error) throw error
    },
    onSuccess: (_, userId) => qc.invalidateQueries({ queryKey: queryKeys.notifications.mine(userId) }),
  })
}

// ── Incidents ─────────────────────────────────────────────────────────────────

// ── Loans ─────────────────────────────────────────────────────────────────────

type LoanWithDetails = InventoryLoan & {
  item: Pick<InventoryItem, 'id' | 'name' | 'category'> | null
  from_classroom: { id: string; name: string } | null
  to_classroom: { id: string; name: string } | null
  requester: { id: string; full_name: string } | null
}

const LOAN_SELECT = '*, item:inventory_items(id,name,category), from_classroom:classrooms!from_classroom_id(id,name), to_classroom:classrooms!to_classroom_id(id,name), requester:profiles!requested_by(id,full_name)'

export function useSchoolInventoryAll(schoolId: string | null, myClassroomId: string | null) {
  return useQuery({
    queryKey: ['inventory', 'school-all', schoolId ?? '', myClassroomId ?? ''],
    enabled: !!schoolId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      let q = db.inventoryItems()
        .select('*, classroom:classrooms(id,name)')
        .eq('school_id', schoolId!)
        .eq('is_active', true)
        .order('name')
      if (myClassroomId) q = (q as any).neq('classroom_id', myClassroomId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as (InventoryItem & { classroom: { id: string; name: string } | null })[]
    },
  })
}

export function useMyOutgoingLoans(classroomId: string | null) {
  return useQuery({
    queryKey: queryKeys.inventory.loans(classroomId ?? ''),
    enabled: !!classroomId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await db.inventoryLoans()
        .select(LOAN_SELECT)
        .eq('to_classroom_id', classroomId!)
        .in('status', ['pending', 'active'])
        .order('requested_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as LoanWithDetails[]
    },
  })
}

export function useMyIncomingLoans(classroomId: string | null) {
  return useQuery({
    queryKey: ['inventory', 'loans-incoming', classroomId ?? ''],
    enabled: !!classroomId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await db.inventoryLoans()
        .select(LOAN_SELECT)
        .eq('from_classroom_id', classroomId!)
        .in('status', ['pending', 'active'])
        .order('requested_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as LoanWithDetails[]
    },
  })
}

export function useSchoolLoans(schoolId: string | null) {
  return useQuery({
    queryKey: queryKeys.inventory.schoolLoans(schoolId ?? ''),
    enabled: !!schoolId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await db.inventoryLoans()
        .select(LOAN_SELECT)
        .eq('school_id', schoolId!)
        .not('status', 'in', '("returned","rejected")')
        .order('requested_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as LoanWithDetails[]
    },
  })
}

export function useRequestLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { schoolId: string; itemId: string; qty: number; fromClassroomId: string; toClassroomId: string; requestedBy: string; notes?: string }) => {
      const { data, error } = await db.inventoryLoans()
        .insert({ school_id: input.schoolId, item_id: input.itemId, qty: input.qty, from_classroom_id: input.fromClassroomId, to_classroom_id: input.toClassroomId, requested_by: input.requestedBy, notes: input.notes ?? null })
        .select().single()
      if (error) throw error
      return data as InventoryLoan
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.loans(data.to_classroom_id) })
      qc.invalidateQueries({ queryKey: ['inventory', 'loans-incoming', data.from_classroom_id] })
    },
  })
}

export function useRespondToLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; status: 'active' | 'rejected'; approvedBy: string; fromClassroomId: string; toClassroomId: string }) => {
      const { data, error } = await db.inventoryLoans()
        .update({ status: input.status, approved_by: input.approvedBy, approved_at: new Date().toISOString() })
        .eq('id', input.id).select().single()
      if (error) throw error
      return data as InventoryLoan
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.loans(vars.toClassroomId) })
      qc.invalidateQueries({ queryKey: ['inventory', 'loans-incoming', vars.fromClassroomId] })
    },
  })
}

export function useReturnLoan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; fromClassroomId: string; toClassroomId: string }) => {
      const { data, error } = await db.inventoryLoans()
        .update({ status: 'returned', returned_at: new Date().toISOString() })
        .eq('id', input.id).select().single()
      if (error) throw error
      return data as InventoryLoan
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.inventory.loans(vars.toClassroomId) })
      qc.invalidateQueries({ queryKey: ['inventory', 'loans-incoming', vars.fromClassroomId] })
    },
  })
}

export function useReportIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { schoolId: string; reportedBy: string; childId?: string; title: string; description: string; category: string; severity: string; occurredAt: string; location?: string; actionTaken?: string }) => {
      const { data, error } = await supabase.from('incident_reports').insert({
        school_id: input.schoolId, reported_by: input.reportedBy,
        child_id: input.childId ?? null, title: input.title,
        description: input.description, category: input.category,
        severity: input.severity, occurred_at: input.occurredAt,
        location: input.location ?? null, action_taken: input.actionTaken ?? null,
        follow_up_required: false, is_resolved: false,
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data: any) => qc.invalidateQueries({ queryKey: ['incidents', data.school_id] }),
  })
}
