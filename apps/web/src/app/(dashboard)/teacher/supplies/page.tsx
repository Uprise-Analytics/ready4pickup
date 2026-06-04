'use client'

import { useState, useMemo } from 'react'
import { useAuthStore } from '@store/auth.store'
import {
  useMyClassroomIds, useMyClassrooms,
  useClassroomConsumableTypes, useCreateConsumableType,
  useTeacherRoster, useChildConsumableStock, useUpsertChildStock,
} from '@hooks/useTeacher'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Skeleton } from '@components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/ui/tabs'
import { Package, Plus, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { Child, ConsumableType, StockLevel } from '@/types/database'

const STOCK_LEVELS: StockLevel[] = ['n/a', 'low', 'medium', 'high']
const LEVEL_LABELS: Record<StockLevel, string> = { 'n/a': 'N/A', low: 'Low', medium: 'Medium', high: 'High' }
const LEVEL_CLASSES: Record<StockLevel, string> = {
  'n/a':   'bg-slate-100 text-slate-500 border-slate-200',
  low:     'bg-red-100 text-red-700 border-red-200',
  medium:  'bg-amber-100 text-amber-700 border-amber-200',
  high:    'bg-green-100 text-green-700 border-green-200',
}

// ── Per-child stock row ───────────────────────────────────────────────────────
function ChildStockRow({ child, types, schoolId, userId }: {
  child: Child
  types: ConsumableType[]
  schoolId: string
  userId: string
}) {
  const { data: stock = [] } = useChildConsumableStock(child.id)
  const upsert = useUpsertChildStock()

  const stockMap = useMemo(() => {
    const m = new Map<string, StockLevel>()
    stock.forEach((s) => m.set(s.consumable_type_id, s.stock_level))
    return m
  }, [stock])

  const name = `${child.first_name} ${child.last_name}`

  return (
    <tr className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
      <td className="px-4 py-3 text-sm font-medium text-slate-800">{name}</td>
      {types.map((t) => {
        const current: StockLevel = stockMap.get(t.id) ?? 'n/a'
        return (
          <td key={t.id} className="px-3 py-2 text-center">
            <div className="flex gap-1 justify-center">
              {STOCK_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => upsert.mutate(
                    { childId: child.id, schoolId, consumableTypeId: t.id, stockLevel: level, updatedBy: userId },
                    { onSuccess: () => toast.success(`${child.first_name}: ${t.name} → ${LEVEL_LABELS[level]}`) }
                  )}
                  className={`px-2 py-0.5 rounded text-xs font-semibold border transition-all ${
                    current === level ? LEVEL_CLASSES[level] : 'bg-white text-slate-300 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {LEVEL_LABELS[level]}
                </button>
              ))}
            </div>
          </td>
        )
      })}
    </tr>
  )
}

// ── Add supply type form ──────────────────────────────────────────────────────
function AddTypeForm({ schoolId, classroomId, userId, onDone }: {
  schoolId: string; classroomId: string; userId: string; onDone: () => void
}) {
  const [emoji, setEmoji] = useState('📦')
  const [name, setName]   = useState('')
  const create = useCreateConsumableType()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await create.mutateAsync({ schoolId, classroomId, name: name.trim(), emoji, createdBy: userId })
      toast.success(`${emoji} ${name} added`)
      setName(''); setEmoji('📦'); onDone()
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
      <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-14 text-center text-xl h-9" maxLength={2} />
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Supply name (e.g. Wet Wipes)" className="flex-1 h-9" autoFocus />
      <Button type="submit" size="sm" disabled={create.isPending || !name.trim()} className="bg-teal-600 hover:bg-teal-700 h-9">
        <Check size={15} />
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone} className="h-9">
        <X size={15} />
      </Button>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeacherSuppliesPage() {
  const { profile } = useAuthStore()
  const schoolId = profile?.school_id ?? null
  const userId   = profile?.id ?? null
  const [addingType, setAddingType] = useState(false)

  const { data: classroomIds = [] } = useMyClassroomIds()
  const { data: classrooms   = [] } = useMyClassrooms(classroomIds)
  const classroomId = classroomIds[0] ?? null

  const { data: types    = [], isLoading: typesLoading } = useClassroomConsumableTypes(classroomId)
  const { data: children = [], isLoading: childrenLoading } = useTeacherRoster(schoolId, classroomIds)

  const classroomName = classrooms[0]?.name ?? 'your class'
  const isLoading = typesLoading || childrenLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
            <Package size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Supplies</h1>
            <p className="text-sm text-slate-500">{classroomName} · {types.length} supply type{types.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="types">
        <TabsList>
          <TabsTrigger value="types">Supply Types</TabsTrigger>
          <TabsTrigger value="stock">Child Stock Levels</TabsTrigger>
        </TabsList>

        {/* ── Supply Types tab ── */}
        <TabsContent value="types" className="mt-4 space-y-3">
          {addingType && schoolId && classroomId && userId && (
            <AddTypeForm
              schoolId={schoolId}
              classroomId={classroomId}
              userId={userId}
              onDone={() => setAddingType(false)}
            />
          )}

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : types.length === 0 && !addingType ? (
            <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
              <p className="text-3xl mb-3">📦</p>
              <p className="font-semibold text-slate-700">No supply types yet</p>
              <p className="text-sm text-slate-400 mt-1">Add supply types that apply to your classroom.</p>
              <Button onClick={() => setAddingType(true)} className="mt-4 bg-teal-600 hover:bg-teal-700">
                <Plus size={15} className="mr-1" /> Add First Supply
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {types.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-2xl">{t.emoji}</span>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.is_active ? 'Active' : 'Inactive'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${t.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
              {!addingType && (
                <Button onClick={() => setAddingType(true)} variant="outline" className="w-full border-dashed border-teal-300 text-teal-600 hover:bg-teal-50">
                  <Plus size={15} className="mr-1" /> Add Supply Type
                </Button>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Child Stock tab ── */}
        <TabsContent value="stock" className="mt-4">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : types.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
              <p className="text-sm text-slate-400">Add supply types first, then set stock levels per child here.</p>
            </div>
          ) : children.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
              <p className="text-sm text-slate-400">No children in your classroom yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <div className="p-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-500 font-medium">Click a level button to set it. Parents see anything <strong>not</strong> marked N/A.</p>
              </div>
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">Child</th>
                    {types.map((t) => (
                      <th key={t.id} className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <span className="block text-base mb-0.5">{t.emoji}</span>
                        {t.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {children.map((child) => (
                    schoolId && userId && (
                      <ChildStockRow
                        key={child.id}
                        child={child}
                        types={types}
                        schoolId={schoolId}
                        userId={userId}
                      />
                    )
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
