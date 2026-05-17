import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local'
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// -------------------------------------------------------
// Typed query helpers
// -------------------------------------------------------

export const db = {
  schools: () => supabase.from('schools'),
  profiles: () => supabase.from('profiles'),
  children: () => supabase.from('children'),
  enrollmentCodes: () => supabase.from('child_enrollment_codes'),
  parentChildLinks: () => supabase.from('parent_child_links'),
  collectorPermissions: () => supabase.from('collector_permissions'),
  childCheckins: () => supabase.from('child_checkins'),
  pickupRequests: () => supabase.from('pickup_requests'),
  pickupEvents: () => supabase.from('pickup_events'),
  notifications: () => supabase.from('notifications'),
  announcements: () => supabase.from('announcements'),
  childNotes: () => supabase.from('child_notes'),
  reportCards: () => supabase.from('report_cards'),
  auditLogs: () => supabase.from('audit_logs'),
  classrooms: () => supabase.from('classrooms'),
  teacherClassroomAssignments: () => supabase.from('teacher_classroom_assignments'),
  diaperChanges: () => supabase.from('diaper_changes'),
  bottleLogs: () => supabase.from('bottle_logs'),
}

// -------------------------------------------------------
// RPC helpers
// -------------------------------------------------------

export const rpc = {
  generateEnrollmentCode: (childId: string) =>
    supabase.rpc('generate_enrollment_code', { p_child_id: childId }),

  linkChildToParent: (code: string, parentId: string, relationship: string) =>
    supabase.rpc('link_child_to_parent', {
      p_code: code,
      p_parent_id: parentId,
      p_relationship: relationship,
    }),

  checkinChild: (childId: string, teacherId: string, notes?: string) =>
    supabase.rpc('checkin_child', {
      p_child_id: childId,
      p_teacher_id: teacherId,
      p_notes: notes ?? null,
    }),

  requestPickup: (params: {
    childId: string
    collectorId: string
    etaMinutes: number
    requestedBy: string
  }) =>
    supabase.rpc('request_pickup', {
      p_child_id: params.childId,
      p_collector_id: params.collectorId,
      p_eta_minutes: params.etaMinutes,
      p_requested_by: params.requestedBy,
    }),

  markPickupArrived: (pickupRequestId: string, actorId: string) =>
    supabase.rpc('mark_pickup_arrived', {
      p_pickup_request_id: pickupRequestId,
      p_actor_id: actorId,
    }),

  markPreparing: (pickupRequestId: string, teacherId: string) =>
    supabase.rpc('mark_preparing', {
      p_pickup_request_id: pickupRequestId,
      p_teacher_id: teacherId,
    }),

  confirmPickup: (pickupRequestId: string, confirmedBy: string, pin: string) =>
    supabase.rpc('confirm_pickup', {
      p_pickup_request_id: pickupRequestId,
      p_confirmed_by: confirmedBy,
      p_pin: pin,
    }),

  cancelPickup: (pickupRequestId: string, cancelledBy: string, reason?: string) =>
    supabase.rpc('cancel_pickup', {
      p_pickup_request_id: pickupRequestId,
      p_cancelled_by: cancelledBy,
      p_reason: reason ?? null,
    }),

  blockCollector: (permissionId: string, blockedBy: string, reason?: string) =>
    supabase.rpc('block_collector', {
      p_permission_id: permissionId,
      p_blocked_by: blockedBy,
      p_reason: reason ?? null,
    }),

  authorizeCollector: (params: {
    childId: string
    collectorId: string
    authorizedBy: string
    relationship: string
  }) =>
    supabase.rpc('authorize_collector', {
      p_child_id: params.childId,
      p_collector_id: params.collectorId,
      p_authorized_by: params.authorizedBy,
      p_relationship: params.relationship,
    }),
}
