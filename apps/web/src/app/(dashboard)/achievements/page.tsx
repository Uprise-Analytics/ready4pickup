'use client'

import { useState, useMemo } from 'react'
import { useAuthStore } from '@store/auth.store'
import {
  useAchievements,
  useCreateAchievement,
  useUpdateAchievement,
} from '@hooks/useAssessments'
import { Award, Plus } from 'lucide-react'
import type { Achievement } from '@/types/database'

const CATEGORIES = ['academic', 'social', 'milestone', 'behavior', 'general'] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_LABELS: Record<Category, string> = {
  academic: 'Academic', social: 'Social', milestone: 'Milestone',
  behavior: 'Behavior', general: 'General',
}

const CATEGORY_COLORS: Record<Category, string> = {
  academic: 'bg-blue-100 text-blue-700',
  social: 'bg-green-100 text-green-700',
  milestone: 'bg-purple-100 text-purple-700',
  behavior: 'bg-amber-100 text-amber-700',
  general: 'bg-slate-100 text-slate-600',
}

const EMOJI_OPTIONS = ['⭐', '🏆', '🎉', '🌟', '🎨', '📚', '🔢', '✏️', '💪', '🤝', '🌈', '🦋', '🎯', '🌱', '❤️']

function AchievementCard({ achievement, onToggle }: { achievement: Achievement; onToggle: () => void }) {
  const cat = achievement.category as Category
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 ${!achievement.is_active ? 'opacity-60' : ''}`}>
      <div className="text-3xl flex-shrink-0 w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
        {achievement.emoji || '⭐'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-slate-900">{achievement.name}</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.general}`}>
            {CATEGORY_LABELS[cat] ?? cat}
          </span>
          {!achievement.is_active && (
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Off</span>
          )}
        </div>
        {achievement.description && <p className="text-sm text-slate-500 mt-0.5">{achievement.description}</p>}
      </div>
      <button onClick={onToggle}
        className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border ${achievement.is_active ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}>
        {achievement.is_active ? 'Disable' : 'Enable'}
      </button>
    </div>
  )
}

function CreateDialog({ schoolId, userId, onClose }: { schoolId: string; userId: string; onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('⭐')
  const [category, setCategory] = useState<Category>('general')
  const { mutateAsync: create, isPending } = useCreateAchievement()

  const handleCreate = async () => {
    if (!name.trim()) return
    await create({ schoolId, name: name.trim(), description: description.trim() || undefined, emoji, category, createdBy: userId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-900 mb-5">New Achievement</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Emoji</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`text-2xl w-10 h-10 rounded-lg flex items-center justify-center ${emoji === e ? 'bg-teal-100 ring-2 ring-teal-400' : 'bg-slate-100 hover:bg-slate-200'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Counted to 10!"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What did the child do to earn this?" rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border capitalize ${category === cat ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-800 mb-0.5">✨ Auto-Award — Coming in Phase 2</p>
            <p className="text-xs text-amber-700">
              In a future update, you'll be able to link achievements to assessment scores so they are suggested or automatically awarded when a child reaches a milestone.
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={handleCreate} disabled={isPending || !name.trim()}
            className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm">
            {isPending ? 'Creating…' : 'Create Achievement'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function AchievementsPage() {
  const { profile } = useAuthStore()
  const schoolId = profile?.school_id ?? null
  const [catFilter, setCatFilter] = useState<Category | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)

  const { data: achievements = [], isLoading } = useAchievements(schoolId)
  const { mutate: update } = useUpdateAchievement()

  const filtered = useMemo(() => {
    if (catFilter === 'all') return achievements
    return achievements.filter((a) => a.category === catFilter)
  }, [achievements, catFilter])

  const countByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    achievements.forEach((a) => { map[a.category ?? 'general'] = (map[a.category ?? 'general'] ?? 0) + 1 })
    return map
  }, [achievements])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award size={24} className="text-teal-600" />
            Achievements
          </h1>
          <p className="text-sm text-slate-500 mt-1">Badges and milestones teachers can award to children</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl text-sm">
          <Plus size={16} /> New Achievement
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setCatFilter('all')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${catFilter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
          All ({achievements.length})
        </button>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border capitalize ${catFilter === cat ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
            {CATEGORY_LABELS[cat]} {countByCategory[cat] ? `(${countByCategory[cat]})` : ''}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading achievements…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Award size={44} className="text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-600 text-lg">No achievements yet</p>
          <p className="text-sm text-slate-400 mt-1">Create your first achievement badge for teachers to award.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((a) => (
            <AchievementCard key={a.id} achievement={a}
              onToggle={() => update({ id: a.id, schoolId: schoolId!, isActive: !a.is_active })} />
          ))}
        </div>
      )}

      {showCreate && <CreateDialog schoolId={schoolId ?? ''} userId={profile?.id ?? ''} onClose={() => setShowCreate(false)} />}
    </div>
  )
}
