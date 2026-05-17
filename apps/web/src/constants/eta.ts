import type { PickupStatus, CheckinStatus } from '@/types/database'

export interface ETAOption {
  label: string
  minutes: number
}

export const ETA_OPTIONS: ETAOption[] = [
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '20 min', minutes: 20 },
  { label: '30 min', minutes: 30 },
]

export const PICKUP_STATUS_LABELS: Record<PickupStatus, string> = {
  on_the_way: 'On the Way',
  arrived: 'Arrived',
  preparing: 'Preparing',
  completed: 'Picked Up',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

export const PICKUP_STATUS_COLORS: Record<PickupStatus, { bg: string; text: string; accent: string }> = {
  on_the_way: { bg: '#fef3c7', text: '#d97706', accent: '#f59e0b' },
  arrived:    { bg: '#dbeafe', text: '#2563eb', accent: '#3b82f6' },
  preparing:  { bg: '#ede9fe', text: '#7c3aed', accent: '#8b5cf6' },
  completed:  { bg: '#d1fae5', text: '#059669', accent: '#10b981' },
  cancelled:  { bg: '#fee2e2', text: '#dc2626', accent: '#ef4444' },
  expired:    { bg: '#f1f5f9', text: '#64748b', accent: '#94a3b8' },
}

export const CHECKIN_STATUS_LABELS: Record<CheckinStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  early_departure: 'Early Departure',
  picked_up: 'Picked Up',
}

export const CHECKIN_STATUS_COLORS: Record<CheckinStatus, { bg: string; text: string }> = {
  present:        { bg: '#d1fae5', text: '#059669' },
  absent:         { bg: '#fee2e2', text: '#dc2626' },
  early_departure:{ bg: '#fef3c7', text: '#d97706' },
  picked_up:      { bg: '#ede9fe', text: '#7c3aed' },
}

export const RELATIONSHIP_OPTIONS = [
  { value: 'mother',      label: 'Mother' },
  { value: 'father',      label: 'Father' },
  { value: 'guardian',    label: 'Legal Guardian' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'uncle',       label: 'Uncle' },
  { value: 'aunt',        label: 'Aunt' },
  { value: 'other',       label: 'Other' },
]
