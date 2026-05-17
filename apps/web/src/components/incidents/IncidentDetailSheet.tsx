'use client'

import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@components/ui/sheet'
import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import { Separator } from '@components/ui/separator'
import { useResolveIncident } from '@hooks/useSchoolAdmin'
import { useAuthStore } from '@store/auth.store'
import type { IncidentWithDetails } from '@hooks/useSchoolAdmin'
import { formatDateTime } from '@utils/format'
import {
  AlertTriangle, User, Baby, MapPin, Eye, ShieldCheck,
  CheckCircle, Clock, Calendar, ClipboardList,
} from 'lucide-react'

const SEVERITY_COLORS: Record<string, string> = {
  low:      'bg-green-100 text-green-700 border-green-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  high:     'bg-red-100 text-red-700 border-red-200',
  critical: 'bg-red-900 text-white border-red-900',
}

const CATEGORY_LABELS: Record<string, string> = {
  injury: 'Injury', behavioral: 'Behavioral', medical: 'Medical',
  safety: 'Safety', property: 'Property', other: 'Other',
}

interface Props {
  incident: IncidentWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-slate-400 flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
        <div className="text-sm text-slate-800">{value}</div>
      </div>
    </div>
  )
}

export function IncidentDetailSheet({ incident, open, onOpenChange }: Props) {
  const profile = useAuthStore((s) => s.profile)
  const { mutateAsync: resolve, isPending } = useResolveIncident()

  if (!incident) return null

  async function handleResolve() {
    if (!incident || !profile) return
    try {
      await resolve({ id: incident.id, schoolId: incident.school_id, resolvedBy: profile.id })
      toast.success('Incident marked as resolved')
      onOpenChange(false)
    } catch {
      toast.error('Failed to resolve incident')
    }
  }

  const childName = incident.child
    ? `${incident.child.first_name} ${incident.child.last_name}`
    : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${incident.is_resolved ? 'bg-green-100' : 'bg-red-100'}`}>
              <AlertTriangle size={16} className={incident.is_resolved ? 'text-green-600' : 'text-red-600'} />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base leading-snug">{incident.title}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${SEVERITY_COLORS[incident.severity]}`}>
                  {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                </span>
                <Badge className="text-xs bg-slate-100 text-slate-600">
                  {CATEGORY_LABELS[incident.category] ?? incident.category}
                </Badge>
                {incident.is_resolved ? (
                  <Badge className="text-xs bg-green-50 text-green-700">Resolved</Badge>
                ) : (
                  <Badge className="text-xs bg-amber-50 text-amber-700 border border-amber-200">Open</Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        <div className="py-5 space-y-5">
          {/* Description */}
          {incident.description && (
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{incident.description}</p>
            </div>
          )}

          <Separator />

          {/* Details grid */}
          <div className="space-y-4">
            <Field
              icon={<User size={15} />}
              label="Reported by"
              value={incident.reporter?.full_name ?? '—'}
            />
            <Field
              icon={<Baby size={15} />}
              label="Child involved"
              value={childName}
            />
            <Field
              icon={<MapPin size={15} />}
              label="Location"
              value={incident.location}
            />
            <Field
              icon={<Eye size={15} />}
              label="Witnesses"
              value={incident.witnesses}
            />
            <Field
              icon={<ClipboardList size={15} />}
              label="Action taken"
              value={incident.action_taken}
            />
            {incident.follow_up_required && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle size={14} className="text-amber-600" />
                <p className="text-sm text-amber-700 font-medium">Follow-up required</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Timeline */}
          <div className="space-y-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Timeline</p>
            <Field
              icon={<Clock size={15} />}
              label="Occurred at"
              value={formatDateTime(incident.occurred_at)}
            />
            <Field
              icon={<Calendar size={15} />}
              label="Reported at"
              value={formatDateTime(incident.created_at)}
            />
            {incident.is_resolved && incident.resolved_at && (
              <Field
                icon={<CheckCircle size={15} />}
                label="Resolved at"
                value={formatDateTime(incident.resolved_at)}
              />
            )}
          </div>
        </div>

        {/* Resolve action */}
        {!incident.is_resolved && (
          <>
            <Separator />
            <div className="pt-4">
              <Button
                className="w-full"
                onClick={handleResolve}
                disabled={isPending}
              >
                <ShieldCheck size={15} className="mr-2" />
                {isPending ? 'Resolving…' : 'Mark as Resolved'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
