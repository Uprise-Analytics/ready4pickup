'use client'

import { useState, useMemo } from 'react'
import { useAuthStore } from '@store/auth.store'
import {
  useAssessmentTemplates,
  useCreateAssessmentTemplate,
  useUpdateAssessmentTemplate,
} from '@hooks/useAssessments'
import { LayoutList, Plus, Search } from 'lucide-react'
import type { AssessmentTemplate, DevelopmentArea } from '@/types/database'

const AREA_LABELS: Record<string, string> = {
  cognitive: 'Cognitive', language: 'Language', fine_motor: 'Fine Motor',
  gross_motor: 'Gross Motor', social_emotional: 'Social & Emotional',
  creative: 'Creative', self_care: 'Self-Care', mathematics: 'Mathematics',
  literacy: 'Literacy', other: 'Other',
}

const SCORING_PRESETS = [
  { method: 'rubric_4', label: '4-Level Rubric', labels: ['Not Observed', 'Needs Support', 'Developing', 'Achieved'], defaultScore: 'Achieved' },
  { method: 'frequency', label: 'Frequency', labels: ['Never', 'Sometimes', 'Usually', 'Always'], defaultScore: 'Usually' },
  { method: 'yes_no', label: 'Yes / No', labels: ['Not Yet', 'Yes'], defaultScore: 'Yes' },
  { method: 'achieved_3', label: '3-Level', labels: ['Not Observed', 'Developing', 'Achieved'], defaultScore: 'Achieved' },
]

function TemplateRow({ template, onToggle }: { template: AssessmentTemplate; onToggle: () => void }) {
  return (
    <tr className={`border-b border-slate-100 ${!template.is_active ? 'opacity-50' : ''}`}>
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-800 text-sm">{template.name}</p>
        {template.criteria && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{template.criteria}</p>}
      </td>
      <td className="px-4 py-3">
        {template.development_area ? (
          <span className="text-xs font-medium text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full capitalize">
            {AREA_LABELS[template.development_area] ?? template.development_area}
          </span>
        ) : <span className="text-xs text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {(template.score_labels as string[]).map((l, i) => (
            <span key={i} className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{l}</span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        {template.is_system ? (
          <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">System</span>
        ) : (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${template.is_active ? 'text-green-700 bg-green-100' : 'text-slate-500 bg-slate-100'}`}>
            {template.is_active ? 'Active' : 'Inactive'}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {!template.is_system && (
          <button onClick={onToggle}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${template.is_active ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}>
            {template.is_active ? 'Deactivate' : 'Activate'}
          </button>
        )}
      </td>
    </tr>
  )
}

function CreateDialog({ schoolId, userId, onClose }: { schoolId: string; userId: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const [area, setArea] = useState<DevelopmentArea | ''>('')
  const [criteria, setCriteria] = useState('')
  const [scoring, setScoring] = useState(SCORING_PRESETS[0])
  const { mutateAsync: create, isPending } = useCreateAssessmentTemplate()

  const handleCreate = async () => {
    if (!name.trim()) return
    await create({ schoolId, name: name.trim(), developmentArea: area || undefined, criteria: criteria.trim() || undefined, scoringMethod: scoring.method, scoreLabels: scoring.labels, defaultScore: scoring.defaultScore, createdBy: userId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-900 mb-5">New Assessment Template</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Counting 1–10"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Development Area</label>
            <select value={area} onChange={(e) => setArea(e.target.value as DevelopmentArea | '')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="">None</option>
              {Object.entries(AREA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Criteria</label>
            <textarea value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder="Observable indicators of success" rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Scoring Method</label>
            <div className="space-y-2">
              {SCORING_PRESETS.map((preset) => (
                <button key={preset.method} onClick={() => setScoring(preset)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left ${scoring.method === preset.method ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${scoring.method === preset.method ? 'border-teal-500 bg-teal-500' : 'border-slate-300'}`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{preset.label}</p>
                    <p className="text-xs text-slate-400">{preset.labels.join(' · ')}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleCreate} disabled={isPending || !name.trim()}
            className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm">
            {isPending ? 'Creating…' : 'Create Template'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function AssessmentTemplatesPage() {
  const { profile } = useAuthStore()
  const schoolId = profile?.school_id ?? null
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'school' | 'system'>('all')
  const [showCreate, setShowCreate] = useState(false)

  const { data: templates = [], isLoading } = useAssessmentTemplates(schoolId)
  const { mutate: update } = useUpdateAssessmentTemplate()

  const filtered = useMemo(() => {
    let list = templates
    if (filter === 'school') list = list.filter((t) => !t.is_system)
    if (filter === 'system') list = list.filter((t) => t.is_system)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((t) => t.name.toLowerCase().includes(q))
    }
    return list
  }, [templates, filter, search])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutList size={24} className="text-teal-600" />
            Assessment Templates
          </h1>
          <p className="text-sm text-slate-500 mt-1">Reusable assessment definitions for your school</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl text-sm">
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['all', 'school', 'system'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-semibold ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {f === 'all' ? 'All' : f === 'school' ? 'My School' : 'System'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading templates…</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Area</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Scoring</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">No templates found</td></tr>
              ) : (
                filtered.map((t) => (
                  <TemplateRow key={t.id} template={t}
                    onToggle={() => update({ id: t.id, schoolId: schoolId!, isActive: !t.is_active })} />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateDialog schoolId={schoolId ?? ''} userId={profile?.id ?? ''} onClose={() => setShowCreate(false)} />}
    </div>
  )
}
