import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns'
import type { PickupStatus, CheckinStatus, Child } from '@/types/database'
import { PICKUP_STATUS_COLORS, CHECKIN_STATUS_COLORS } from '@constants/eta'

export function formatTime(date: Date | string): string {
  return format(new Date(date), 'h:mm a')
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateShort(date: Date | string): string {
  return format(new Date(date), 'MMM d')
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'MMM d, h:mm a')
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatETA(etaAt: Date | string | null, etaMinutes: number | null): string {
  if (etaAt) {
    const diff = differenceInMinutes(new Date(etaAt), new Date())
    if (diff <= 0) return 'Arriving now'
    return `Arriving in ~${diff} min`
  }
  if (etaMinutes != null && etaMinutes > 0) return `~${etaMinutes} min`
  return 'ETA unknown'
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function formatChildName(child: Pick<Child, 'first_name' | 'last_name'>): string {
  return `${child.first_name} ${child.last_name}`
}

export function formatRelationship(rel: string): string {
  const map: Record<string, string> = {
    mother: 'Mother', father: 'Father', guardian: 'Guardian',
    grandparent: 'Grandparent', uncle: 'Uncle', aunt: 'Aunt', other: 'Authorized Collector',
  }
  return map[rel.toLowerCase()] ?? rel
}

export function getPickupStatusColor(status: PickupStatus) {
  return PICKUP_STATUS_COLORS[status] ?? PICKUP_STATUS_COLORS.expired
}

export function getCheckinStatusColor(status: CheckinStatus) {
  return CHECKIN_STATUS_COLORS[status] ?? CHECKIN_STATUS_COLORS.absent
}

const AVATAR_COLORS = [
  '#2563EB', '#7C3AED', '#0D9488', '#EA580C', '#D97706',
  '#059669', '#DC2626', '#9333EA', '#0284C7', '#65A30D',
]

export function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function isValidEnrollmentCode(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code.trim().toUpperCase())
}
