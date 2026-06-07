'use client'

import { useState, useMemo } from 'react'
import { useAuthStore } from '@store/auth.store'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lib/supabase'
import {
  useAssessmentPacks,
  useApplyPackToClassrooms,
} from '@hooks/useAssessments'
import { Package, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import type { AssessmentPack } from '@/types/database'

function ApplyDialog({
  pack, schoolId, createdBy, onClose,
}: { pack: AssessmentPack; schoolId: string; createdBy: string; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const { mutateAsync: applyPack, isPending } = useApplyPackToClassrooms()

  const { data: classrooms = [] } = useQuery({
    queryKey: ['classrooms', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase.from('classrooms').select('id, name').eq('school_id', schoolId).order('name')
      return (data ?? []) as { id: string; name: string }[]
    },
  })

  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleApply = async () => {
    if (selected.size === 0) return
    await applyPack({ packId: pack.id, schoolId, classroomIds: Array.from(selected), createdBy })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Apply Pack to Classrooms</h2>
        <p className="text-sm text-slate-500 mb-5">{pack.name} {pack.version_label && `· ${pack.version_label}`}</p>

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Classrooms</p>
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 mb-5 max-h-52 overflow-y-auto">
          {classrooms.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No classrooms found</p>
          ) : classrooms.map((c) => (
            <label key={c.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)}
                className="rounded text-teal-600 cursor-pointer" />
              <span className="text-sm font-medium text-slate-800">{c.name}</span>
            </label>
          ))}
        </div>

        {selected.size > 0 && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-xs text-teal-700 font-semibold">
              One assessment plan per template will be created for each selected classroom.
              Existing plans are not affected.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleApply} disabled={isPending || selected.size === 0}
            className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm">
            {isPending ? 'Applying…' : `Apply to ${selected.size} classroom${selected.size !== 1 ? 's' : ''}`}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function PackCard({ pack, onApply }: { pack: AssessmentPack; onApply: () => void }) {
  const [expanded, setExpanded] = useState(false)

  const { data: templates = [] } = useQuery({
    queryKey: ['pack-templates', pack.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('assessment_pack_templates')
        .select('id, sort_order, template:assessment_templates(name, development_area)')
        .eq('pack_id', pack.id)
        .order('sort_order')
      return (data ?? []) as any[]
    },
  })

  return (
    <div className={`bg-white border rounded-xl ${pack.is_deprecated ? 'border-slate-200 opacity-70' : 'border-slate-200'}`}>
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-900">{pack.name}</p>
              {pack.version_label && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pack.is_deprecated ? 'bg-slate-100 text-slate-400' : 'bg-teal-100 text-teal-700'}`}>
                  {pack.version_label}
                </span>
              )}
              {pack.is_deprecated && (
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Superseded</span>
              )}
              {pack.is_system && (
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">System</span>
              )}
            </div>
            {pack.description && <p className="text-sm text-slate-500 mt-0.5">{pack.description}</p>}
            {pack.age_range && <p className="text-xs text-slate-400 mt-0.5">Ages {pack.age_range}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!pack.is_deprecated && (
              <button onClick={onApply}
                className="text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-lg">
                Apply to Classroom
              </button>
            )}
            <button onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Preview templates (up to 4) */}
        {!expanded && templates.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {templates.slice(0, 4).map((t: any) => (
              <span key={t.id} className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{t.template?.name}</span>
            ))}
            {templates.length > 4 && (
              <span className="text-xs text-slate-400 px-2 py-0.5">+{templates.length - 4} more</span>
            )}
          </div>
        )}
      </div>

      {/* Expanded template list */}
      {expanded && templates.length > 0 && (
        <div className="border-t border-slate-100">
          {templates.map((t: any, i: number) => (
            <div key={t.id} className={`flex items-center gap-3 px-5 py-2.5 ${i < templates.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <span className="text-xs font-semibold text-slate-300 w-4">{i + 1}</span>
              <p className="text-sm text-slate-700 flex-1">{t.template?.name}</p>
              {t.template?.development_area && (
                <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full capitalize">
                  {t.template.development_area.replace('_', ' ')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AssessmentPacksPage() {
  const { profile } = useAuthStore()
  const schoolId = profile?.school_id ?? null
  const [applyTarget, setApplyTarget] = useState<AssessmentPack | null>(null)
  const [showDeprecated, setShowDeprecated] = useState(false)

  const { data: packs = [], isLoading } = useAssessmentPacks(schoolId)

  const { active, deprecated } = useMemo(() => ({
    active: packs.filter((p) => !p.is_deprecated),
    deprecated: packs.filter((p) => p.is_deprecated),
  }), [packs])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package size={24} className="text-teal-600" />
            Assessment Packs
          </h1>
          <p className="text-sm text-slate-500 mt-1">Apply ready-made assessment bundles to your classrooms instantly</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">How packs work</p>
        <p className="text-xs text-blue-700">
          Applying a pack creates one assessment plan per template for each selected classroom.
          Existing plans are not affected. When a new pack version is published, an upgrade banner will appear here.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading packs…</div>
      ) : (
        <div className="space-y-4">
          {active.length === 0 ? (
            <div className="text-center py-16">
              <Package size={44} className="text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-600 text-lg">No assessment packs available</p>
              <p className="text-sm text-slate-400 mt-1">Contact support to have starter packs added to your account.</p>
            </div>
          ) : (
            active.map((pack) => (
              <PackCard key={pack.id} pack={pack} onApply={() => setApplyTarget(pack)} />
            ))
          )}

          {deprecated.length > 0 && (
            <div>
              <button onClick={() => setShowDeprecated(!showDeprecated)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 mt-2">
                {showDeprecated ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showDeprecated ? 'Hide' : 'Show'} {deprecated.length} superseded {deprecated.length === 1 ? 'pack' : 'packs'}
              </button>
              {showDeprecated && (
                <div className="space-y-3 mt-3">
                  {deprecated.map((pack) => (
                    <PackCard key={pack.id} pack={pack} onApply={() => setApplyTarget(pack)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {applyTarget && (
        <ApplyDialog
          pack={applyTarget}
          schoolId={schoolId ?? ''}
          createdBy={profile?.id ?? ''}
          onClose={() => setApplyTarget(null)}
        />
      )}
    </div>
  )
}
