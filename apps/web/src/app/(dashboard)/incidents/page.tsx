'use client'

import { useState } from 'react'
import { useAuthStore } from '@store/auth.store'
import { useSchoolIncidents, useAllIncidents, useIncidentsRealtime, useAllIncidentsRealtime } from '@hooks/useSchoolAdmin'
import { IncidentChart } from '@components/incidents/IncidentChart'
import { IncidentTable } from '@components/incidents/IncidentTable'
import { IncidentDetailSheet } from '@components/incidents/IncidentDetailSheet'
import { ReportIncidentDialog } from '@components/incidents/ReportIncidentDialog'
import { Button } from '@components/ui/button'
import { AlertTriangle, Plus } from 'lucide-react'
import { Skeleton } from '@components/ui/skeleton'
import type { IncidentWithDetails } from '@hooks/useSchoolAdmin'

export default function IncidentsPage() {
  const profile = useAuthStore((s) => s.profile)

  if (!profile) return null

  return profile.role === 'platform_owner'
    ? <AllIncidentsView />
    : <SchoolIncidentsView schoolId={profile.school_id ?? ''} />
}

function SchoolIncidentsView({ schoolId }: { schoolId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<IncidentWithDetails | null>(null)
  const { data: incidents = [], isLoading } = useSchoolIncidents(schoolId)
  useIncidentsRealtime(schoolId)

  const openCount = incidents.filter((i) => !i.is_resolved).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
            <AlertTriangle size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Incidents</h1>
            <p className="text-sm text-slate-500">
              {openCount} open · {incidents.length} total
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus size={15} className="mr-1" />
          Report Incident
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : (
        <IncidentChart incidents={incidents} />
      )}

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <IncidentTable incidents={incidents} onSelect={setSelectedIncident} />
      )}

      <ReportIncidentDialog open={dialogOpen} onOpenChange={setDialogOpen} schoolId={schoolId} />
      <IncidentDetailSheet
        incident={selectedIncident}
        open={!!selectedIncident}
        onOpenChange={(o) => { if (!o) setSelectedIncident(null) }}
      />
    </div>
  )
}

function AllIncidentsView() {
  const [selectedIncident, setSelectedIncident] = useState<IncidentWithDetails | null>(null)
  const { data: incidents = [], isLoading } = useAllIncidents()
  useAllIncidentsRealtime()

  const openCount = incidents.filter((i) => !i.is_resolved).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
          <AlertTriangle size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Incidents</h1>
          <p className="text-sm text-slate-500">
            {openCount} open · {incidents.length} total across all schools
          </p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[220px] w-full" />
      ) : (
        <IncidentChart incidents={incidents} />
      )}

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <IncidentTable incidents={incidents} onSelect={setSelectedIncident} />
      )}

      <IncidentDetailSheet
        incident={selectedIncident}
        open={!!selectedIncident}
        onOpenChange={(o) => { if (!o) setSelectedIncident(null) }}
      />
    </div>
  )
}
