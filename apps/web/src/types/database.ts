// -------------------------------------------------------
// Database types — keep in sync with mobile/src/types/database.ts
// -------------------------------------------------------

export type UserRole = 'platform_owner' | 'school_admin' | 'teacher' | 'parent' | 'collector'
export type StockLevel = 'n/a' | 'low' | 'medium' | 'high'

export interface ConsumableType {
  id: string
  school_id: string
  classroom_id: string | null
  name: string
  emoji: string
  created_by: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ChildConsumableStock {
  id: string
  child_id: string
  school_id: string
  consumable_type_id: string
  stock_level: StockLevel
  updated_by: string | null
  updated_at: string
}
export type PickupStatus = 'on_the_way' | 'arrived' | 'preparing' | 'completed' | 'cancelled' | 'expired'
export type CheckinStatus = 'present' | 'absent' | 'early_departure' | 'picked_up'
export type NoteType = 'general' | 'medical' | 'behavioral' | 'achievement'
export type PermissionStatus = 'pending' | 'approved' | 'blocked' | 'revoked'
export type AssessmentPlanApprovalStatus = 'pending_approval' | 'approved' | 'rejected'

export interface School {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  timezone: string
  is_active: boolean
  settings: SchoolSettings
  created_at: string
  updated_at: string
}

export interface SchoolSettings {
  allow_self_checkin?: boolean
  require_pin_confirmation?: boolean
  max_active_pickups?: number
  auto_expire_pickup_minutes?: number
  announcement_enabled?: boolean
  require_collector_photo?: boolean
  enable_emotion_tracking?: boolean
  show_teacher_info_to_parents?: boolean
}

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  phone: string | null
  role: UserRole
  school_id: string | null
  is_active: boolean
  push_token: string | null
  notification_prefs: NotificationPreferences
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  on_way: boolean
  preparing: boolean
  picked_up: boolean
  announcements: boolean
  blocked_alert: boolean
  diaper_change?: boolean
}

export interface Child {
  id: string
  school_id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  grade: string | null
  classroom: string | null
  classroom_id: string | null
  avatar_url: string | null
  allergies: string[]
  medical_notes: string | null
  special_instructions: string | null
  emergency_contacts: EmergencyContact[]
  student_id: string | null
  qr_code: string | null
  is_active: boolean
  wears_diapers: boolean
  drinks_bottle: boolean
  parent_whatsapp: string | null
  deleted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Classroom {
  id: string
  school_id: string
  name: string
  is_baby_class: boolean
  color: string
  capacity: number | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TeacherClassroomAssignment {
  id: string
  teacher_id: string
  classroom_id: string
  school_id: string
  is_active: boolean
  assigned_at: string
}

export interface TeacherPermission {
  teacher_id: string
  school_id: string
  can_checkout: boolean
  granted_by: string | null
  updated_at: string
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  is_primary: boolean
}

export interface ChildEnrollmentCode {
  id: string
  child_id: string
  school_id: string
  code: string
  is_used: boolean
  used_by: string | null
  used_at: string | null
  expires_at: string
  created_by: string | null
  created_at: string
}

export interface ParentChildLink {
  id: string
  parent_id: string
  child_id: string
  school_id: string
  relationship: string
  is_primary: boolean
  is_active: boolean
  linked_at: string
  created_at: string
}

export interface CollectorPermission {
  id: string
  child_id: string
  school_id: string
  collector_id: string
  authorized_by: string
  relationship: string
  status: PermissionStatus
  is_approved: boolean
  is_blocked: boolean
  approved_at: string | null
  blocked_by: string | null
  blocked_at: string | null
  block_reason: string | null
  created_at: string
  updated_at: string
}

export interface ChildCheckin {
  id: string
  child_id: string
  school_id: string
  checked_in_by: string | null
  checked_in_at: string
  checked_out_at: string | null
  status: CheckinStatus
  date: string
  notes: string | null
  emotion: string | null
  created_at: string
}

export interface PickupRequest {
  id: string
  child_id: string
  school_id: string
  checkin_id: string
  requested_by: string
  collector_id: string
  status: PickupStatus
  eta_minutes: number | null
  eta_at: string | null
  pickup_pin: string
  on_the_way_at: string
  arrived_at: string | null
  preparing_at: string | null
  completed_at: string | null
  completed_by: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancel_reason: string | null
  handoff_notes: string | null
  created_at: string
  updated_at: string
}

export interface PickupEvent {
  id: string
  pickup_request_id: string
  child_id: string
  school_id: string
  event_type: string
  triggered_by: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  school_id: string | null
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  created_at: string
}

export type AnnouncementAudience = 'all' | 'teachers' | 'parents'

export interface Announcement {
  id: string
  school_id: string
  created_by: string | null
  title: string
  body: string
  is_published: boolean
  published_at: string | null
  expires_at: string | null
  target_audience: AnnouncementAudience
  target_classroom_ids: string[] | null
  created_at: string
  updated_at: string
}

export interface ChildNote {
  id: string
  child_id: string
  school_id: string
  created_by: string
  note_type: NoteType
  content: string
  is_private: boolean
  deleted_at: string | null
  created_at: string
}

export interface ReportCard {
  id: string
  child_id: string
  school_id: string
  created_by: string
  period: string
  subjects: ReportSubject[]
  overall_comment: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface ReportSubject {
  name: string
  grade: string
  comment: string | null
}

export interface AuditLog {
  id: string
  school_id: string | null
  actor_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentCategory = 'injury' | 'behavioral' | 'medical' | 'safety' | 'property' | 'other'

export interface IncidentReport {
  id: string
  school_id: string
  reported_by: string
  child_id: string | null
  title: string
  description: string
  category: IncidentCategory
  severity: IncidentSeverity
  occurred_at: string
  location: string | null
  witnesses: string | null
  action_taken: string | null
  follow_up_required: boolean
  is_resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
}

export interface IncidentReportWithDetails extends IncidentReport {
  reporter: Pick<Profile, 'id' | 'full_name'>
  child: Pick<Child, 'id' | 'first_name' | 'last_name'> | null
}

export interface ChildWithLinks extends Child {
  parent_child_links?: ParentChildLink[]
  collector_permissions?: CollectorPermission[]
}

export interface ActivePickup extends PickupRequest {
  child: Pick<Child, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'classroom' | 'allergies'>
  collector: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'phone'>
  collector_relationship?: string
  checkin: ChildCheckin
}

export interface PickupRequestWithDetails extends PickupRequest {
  child: Child
  collector: Profile
  requested_by_profile: Profile
  events?: PickupEvent[]
}

export interface ChildWithDetails extends Child {
  school: School
  classroom_data: { id: string; name: string; is_baby_class: boolean; color: string } | null
  parent_child_links: Array<ParentChildLink & { parent: Profile }>
  collector_permissions: Array<CollectorPermission & { collector: Profile }>
  today_checkin: ChildCheckin | null
  active_pickup: ActivePickup | null
  recent_notes: ChildNote[]
  recent_report_cards: ReportCard[]
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      schools: {
        Row: School
        Insert: Omit<School, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<School, 'id' | 'created_at' | 'updated_at'>>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      children: {
        Row: Child
        Insert: Omit<Child, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Child, 'id' | 'created_at' | 'updated_at'>>
      }
      child_enrollment_codes: {
        Row: ChildEnrollmentCode
        Insert: Omit<ChildEnrollmentCode, 'id' | 'created_at'>
        Update: Partial<Omit<ChildEnrollmentCode, 'id' | 'created_at'>>
      }
      parent_child_links: {
        Row: ParentChildLink
        Insert: Omit<ParentChildLink, 'id' | 'created_at' | 'linked_at'>
        Update: Partial<Omit<ParentChildLink, 'id' | 'created_at' | 'linked_at'>>
      }
      collector_permissions: {
        Row: CollectorPermission
        Insert: Omit<CollectorPermission, 'id' | 'created_at' | 'updated_at' | 'is_approved' | 'is_blocked'>
        Update: Partial<Omit<CollectorPermission, 'id' | 'created_at' | 'is_approved' | 'is_blocked'>>
      }
      child_checkins: {
        Row: ChildCheckin
        Insert: Omit<ChildCheckin, 'id' | 'created_at'>
        Update: Partial<Omit<ChildCheckin, 'id' | 'created_at'>>
      }
      pickup_requests: {
        Row: PickupRequest
        Insert: Omit<PickupRequest, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PickupRequest, 'id' | 'created_at' | 'updated_at'>>
      }
      pickup_events: {
        Row: PickupEvent
        Insert: Omit<PickupEvent, 'id' | 'created_at'>
        Update: never
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
      announcements: {
        Row: Announcement
        Insert: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Announcement, 'id' | 'created_at' | 'updated_at'>>
      }
      child_notes: {
        Row: ChildNote
        Insert: Omit<ChildNote, 'id' | 'created_at'>
        Update: Partial<Omit<ChildNote, 'id' | 'created_at'>>
      }
      report_cards: {
        Row: ReportCard
        Insert: Omit<ReportCard, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ReportCard, 'id' | 'created_at' | 'updated_at'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: never
      }
      classrooms: {
        Row: Classroom
        Insert: Omit<Classroom, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Classroom, 'id' | 'created_at' | 'updated_at'>>
      }
      teacher_classroom_assignments: {
        Row: TeacherClassroomAssignment
        Insert: Omit<TeacherClassroomAssignment, 'id' | 'assigned_at'>
        Update: Partial<Omit<TeacherClassroomAssignment, 'id' | 'assigned_at'>>
      }
      teacher_permissions: {
        Row: TeacherPermission
        Insert: Omit<TeacherPermission, 'updated_at'>
        Update: Partial<Omit<TeacherPermission, 'updated_at'>>
      }
      incident_reports: {
        Row: IncidentReport
        Insert: Omit<IncidentReport, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<IncidentReport, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Views: Record<string, never>
    Functions: {
      generate_enrollment_code: { Args: { p_child_id: string }; Returns: string }
      link_child_to_parent: { Args: { p_code: string; p_parent_id: string; p_relationship: string }; Returns: Json }
      checkin_child: { Args: { p_child_id: string; p_teacher_id: string; p_notes?: string }; Returns: Json }
      request_pickup: { Args: { p_child_id: string; p_collector_id: string; p_eta_minutes: number; p_requested_by: string }; Returns: Json }
      mark_pickup_arrived: { Args: { p_pickup_request_id: string; p_actor_id: string }; Returns: Json }
      mark_preparing: { Args: { p_pickup_request_id: string; p_teacher_id: string }; Returns: Json }
      confirm_pickup: { Args: { p_pickup_request_id: string; p_confirmed_by: string; p_pin: string }; Returns: Json }
      cancel_pickup: { Args: { p_pickup_request_id: string; p_cancelled_by: string; p_reason?: string }; Returns: Json }
      block_collector: { Args: { p_permission_id: string; p_blocked_by: string; p_reason?: string }; Returns: Json }
      authorize_collector: { Args: { p_child_id: string; p_collector_id: string; p_authorized_by: string; p_relationship: string }; Returns: Json }
    }
    Enums: {
      user_role: UserRole
      pickup_status: PickupStatus
      checkin_status: CheckinStatus
      note_type: NoteType
      permission_status: PermissionStatus
    }
  }
}

// -------------------------------------------------------
// Inventory
// -------------------------------------------------------

export type InventoryCategory = 'furniture' | 'equipment' | 'book' | 'toy' | 'art_supply' | 'other'
export type InventoryCondition = 'good' | 'fair' | 'damaged'
export type StockTakeCondition = 'good' | 'fair' | 'damaged' | 'missing'
export type InventoryEventType = 'damage' | 'transfer' | 'home_item' | 'replenishment'
export type InventoryEventStatus = 'pending' | 'approved' | 'rejected'
export type StockTakeStatus = 'submitted' | 'reviewed'

export interface InventoryItem {
  id: string
  school_id: string
  classroom_id: string | null
  name: string
  category: InventoryCategory
  serial_number: string | null
  quantity: number
  condition: InventoryCondition
  is_consumable: boolean
  notes: string | null
  assigned_by: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InventoryEvent {
  id: string
  school_id: string
  item_id: string | null
  classroom_id: string | null
  event_type: InventoryEventType
  description: string | null
  qty: number
  target_classroom_id: string | null
  reported_by: string | null
  status: InventoryEventStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface StockTake {
  id: string
  school_id: string
  classroom_id: string
  submitted_by: string
  status: StockTakeStatus
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  submitted_at: string
  created_at: string
}

export interface StockTakeItem {
  id: string
  stock_take_id: string
  item_id: string
  expected_qty: number
  actual_qty: number
  condition: StockTakeCondition
  notes: string | null
}

export type InventoryLoanStatus = 'pending' | 'active' | 'returned' | 'rejected'

export interface InventoryLoan {
  id: string
  school_id: string
  item_id: string
  qty: number
  from_classroom_id: string
  to_classroom_id: string
  requested_by: string
  approved_by: string | null
  status: InventoryLoanStatus
  notes: string | null
  requested_at: string
  approved_at: string | null
  returned_at: string | null
  created_at: string
}

// -------------------------------------------------------
// Assessments
// -------------------------------------------------------

export type AssessmentScoringMethod = 'rubric_4' | 'frequency' | 'yes_no' | 'achieved_3' | 'custom'
export type AssessmentFrequency = 'daily' | 'weekly' | 'monthly' | 'term' | 'once'
export type AssessmentSessionStatus = 'in_progress' | 'completed'
export type AchievementCategory = 'academic' | 'social' | 'milestone' | 'behavior' | 'general'
export type DevelopmentArea = 'cognitive' | 'language' | 'fine_motor' | 'gross_motor' | 'social_emotional' | 'creative' | 'self_care' | 'mathematics' | 'literacy' | 'other'
export type AgeGroup = '2-3' | '3-4' | '4-5' | 'all'

export const DEVELOPMENT_AREA_LABELS: Record<DevelopmentArea, string> = {
  cognitive: 'Cognitive',
  language: 'Language',
  fine_motor: 'Fine Motor',
  gross_motor: 'Gross Motor',
  social_emotional: 'Social & Emotional',
  creative: 'Creative',
  self_care: 'Self Care',
  mathematics: 'Mathematics',
  literacy: 'Literacy',
  other: 'Other',
}

export interface AssessmentTemplate {
  id: string
  school_id: string | null
  name: string
  activity: string | null
  development_area: DevelopmentArea | null
  learning_outcome: string | null
  criteria: string | null
  scoring_method: AssessmentScoringMethod
  score_labels: string[]
  default_score: string
  age_group: AgeGroup
  is_system: boolean
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AssessmentPack {
  id: string
  school_id: string | null
  name: string
  description: string | null
  age_range: string | null
  version: number
  version_label: string
  parent_pack_id: string | null
  published_at: string | null
  is_deprecated: boolean
  is_system: boolean
  is_active: boolean
  created_by: string | null
  created_at: string
}

export interface AssessmentPackTemplate {
  id: string
  pack_id: string
  template_id: string
  default_frequency: AssessmentFrequency
  sort_order: number
  created_at: string
}

export interface AssessmentPackWithTemplates extends AssessmentPack {
  pack_templates: Array<AssessmentPackTemplate & { template: AssessmentTemplate }>
}

export interface AssessmentPlan {
  id: string
  school_id: string
  classroom_id: string
  template_id: string | null
  pack_id: string | null
  submission_id: string | null
  name: string
  activity: string | null
  development_area: DevelopmentArea | null
  learning_outcome: string | null
  criteria: string | null
  scoring_method: AssessmentScoringMethod
  score_labels: string[]
  default_score: string
  frequency: AssessmentFrequency
  scheduled_date: string | null
  day_of_week: number | null
  day_of_month: number | null
  is_active: boolean
  approval_status: AssessmentPlanApprovalStatus
  approved_by: string | null
  approved_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PlanSubmission {
  id: string
  school_id: string
  classroom_id: string
  submitted_by: string | null
  name: string
  term: string | null
  approval_status: AssessmentPlanApprovalStatus
  approved_by: string | null
  approved_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export interface PlanSubmissionWithDetails extends PlanSubmission {
  classroom: Pick<Classroom, 'id' | 'name'>
  submitter: Pick<Profile, 'id' | 'full_name'> | null
  items: AssessmentPlan[]
}

export interface AssessmentSession {
  id: string
  school_id: string
  plan_id: string
  classroom_id: string | null
  teacher_id: string | null
  session_date: string
  status: AssessmentSessionStatus
  bulk_note: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface AssessmentSessionWithPlan extends AssessmentSession {
  plan: Pick<AssessmentPlan, 'id' | 'name' | 'development_area' | 'score_labels' | 'default_score' | 'criteria' | 'scoring_method'>
}

export interface AssessmentScore {
  id: string
  session_id: string
  school_id: string
  child_id: string
  score: string
  is_absent: boolean
  notes: string | null
  photo_url: string | null
  assessed_by: string | null
  created_at: string
  updated_at: string
}

export interface AssessmentScoreWithChild extends AssessmentScore {
  child: Pick<Child, 'id' | 'first_name' | 'last_name' | 'avatar_url'>
}

export interface ChildObservation {
  id: string
  school_id: string
  classroom_id: string | null
  observed_by: string | null
  development_area: DevelopmentArea | null
  observation: string
  photo_url: string | null
  is_group: boolean
  is_published: boolean
  observed_at: string
  created_at: string
}

export interface ChildObservationWithChildren extends ChildObservation {
  children: Array<{ child_id: string; child: Pick<Child, 'id' | 'first_name' | 'last_name'> }>
  observer: Pick<Profile, 'id' | 'full_name'> | null
}

export interface Achievement {
  id: string
  school_id: string
  name: string
  description: string | null
  emoji: string
  category: AchievementCategory
  trigger_template_id: string | null
  trigger_score: string | null
  trigger_consecutive: number | null
  auto_award: boolean
  is_active: boolean
  created_by: string | null
  created_at: string
}

export interface ChildAchievement {
  id: string
  school_id: string
  child_id: string
  achievement_id: string
  session_id: string | null
  awarded_by: string | null
  notes: string | null
  awarded_at: string
  created_at: string
}

export interface ChildAchievementWithDetails extends ChildAchievement {
  achievement: Pick<Achievement, 'id' | 'name' | 'emoji' | 'category'>
  awarder: Pick<Profile, 'id' | 'full_name'> | null
}

export interface ClassroomDailyLog {
  id: string
  school_id: string
  classroom_id: string
  log_date: string
  summary: string | null
  is_published: boolean
  published_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// -------------------------------------------------------
// Staff Certificates
// -------------------------------------------------------

export interface StaffCertificate {
  id: string
  school_id: string
  staff_id: string
  title: string
  certificate_type: string
  expiry_date: string
  file_url: string | null
  notes: string | null
  uploaded_by: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StaffCertificateWithStaff extends StaffCertificate {
  staff: Pick<Profile, 'id' | 'full_name' | 'role'>
}

export function getCertStatus(expiryDate: string): 'expired' | 'expiring_soon' | 'valid' {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const exp = new Date(expiryDate)
  if (exp < today) return 'expired'
  const limit = new Date(today); limit.setDate(today.getDate() + 60)
  return exp <= limit ? 'expiring_soon' : 'valid'
}

// -------------------------------------------------------
// Duty Roster
// -------------------------------------------------------

export interface DutyLocation {
  id: string
  school_id: string
  name: string
  description: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
}

export interface DutyAssignment {
  id: string
  school_id: string
  teacher_id: string
  location_id: string
  duty_date: string
  start_time: string
  end_time: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DutyAssignmentWithDetails extends DutyAssignment {
  location: Pick<DutyLocation, 'id' | 'name'>
  teacher: { id: string; full_name: string; email: string }
}
