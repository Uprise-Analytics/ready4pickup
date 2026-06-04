'use client'

import { useState } from 'react'
import { useAuthStore } from '@store/auth.store'
import { useSchoolIncidents } from '@hooks/useSchoolAdmin'
import { useReportIncident } from '@hooks/useTeacher'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Skeleton } from '@components/ui/skeleton'
import { AlertTriangle, Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

const SEVERITY_CONFIG: Record<string, { label: string; className: string; emoji: string }> = {
  low:      { label: 'Low',      className: 'bg-blue-50 text-blue-700 border-blue-200',    emoji: '📋' },
  medium:   { label: 'Medium',   className: 'bg-amber-50 text-amber-700 border-amber-200', emoji: '⚠️' },
  high:     { label: 'High',     className: 'bg-orange-50 text-orange-700 border-orange-200', emoji: '🚨' },
  critical: { label: 'Critical', className: 'bg-red-50 text-red-700 border-red-200',       emoji: '🆘' },
}

const CATEGORIES = ['injury', 'behavioral', 'medical', 'safety', 'property', 'other']
const SEVERITIES = ['low', 'medium', 'high', 'critical']

export default function TeacherIncidentsPage() {
  const { profile } = useAuthStore()
  const schoolId = profile?.school_id ?? null
  const userId   = profile?.id ?? null

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle]           = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory]     = useState('other')
  const [severity, setSeverity]     = useState('low')
  const [location, setLocation]     = useState('')
  const [actionTaken, setActionTaken] = useState('')

  const { data: incidents = [], isLoading } = useSchoolIncidents(schoolId)
  const report = useReportIncident()

  const resetForm = () => {
    setTitle(''); setDescription(''); setCategory('other')
    setSeverity('low'); setLocation(''); setActionTaken('')
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) { toast.error('Title and description are required'); return }
    if (!schoolId || !userId) return
    try {
      await report.mutateAsync({
        schoolId, reportedBy: userId, title: title.trim(),
        description: description.trim(), category, severity,
        occurredAt: new Date().toISOString(),
        location: location.trim() || undefined,
        actionTaken: actionTaken.trim() || undefined,
      })
      toast.success('Incident reported')
      resetForm()
    } catch (err: any) { toast.error(err.message) }
  }

  const openCount = incidents.filter((i) => !i.is_resolved).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <AlertTriangle size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Incidents</h1>
            <p className="text-sm text-slate-500">{openCount} open · {incidents.length} total</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-amber-500 hover:bg-amber-600 gap-1.5">
          <Plus size={15} /> Report Incident
        </Button>
      </div>

      {/* Report form */}
      {showForm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-amber-900">Report New Incident</p>
            <button onClick={resetForm} className="text-amber-600 hover:text-amber-800"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Incident title *" required />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened *"
              required
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />

            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button key={c} type="button" onClick={() => setCategory(c)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all capitalize ${
                        category === c ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Severity</label>
                <div className="flex gap-1.5">
                  {SEVERITIES.map((s) => {
                    const cfg = SEVERITY_CONFIG[s]
                    return (
                      <button key={s} type="button" onClick={() => setSeverity(s)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                          severity === s ? cfg.className : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                        }`}>
                        {cfg.emoji} {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" />
              <Input value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} placeholder="Action taken (optional)" />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={report.isPending} className="bg-amber-500 hover:bg-amber-600">
                {report.isPending ? 'Submitting…' : 'Submit Report'}
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Incidents list */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : incidents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-20 text-center">
          <AlertTriangle size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600">No incidents reported</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {incidents.map((incident: any) => {
            const sev = SEVERITY_CONFIG[incident.severity] ?? SEVERITY_CONFIG.low
            return (
              <div key={incident.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50">
                <div className="mt-0.5">
                  <span className={`text-lg`}>{sev.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-slate-800 text-sm">{incident.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${sev.className}`}>{sev.label}</span>
                    {incident.is_resolved && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-50 text-green-700 border border-green-200">Resolved</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{incident.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400 capitalize">{incident.category}</span>
                    {incident.location && <span className="text-xs text-slate-400">📍 {incident.location}</span>}
                    <span className="text-xs text-slate-400">{format(new Date(incident.occurred_at), 'MMM d, yyyy · h:mm a')}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
