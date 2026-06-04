'use client'

import { useState, useMemo } from 'react'
import { useAuthStore } from '@store/auth.store'
import {
  useMyClassroomIds, useMyClassrooms,
  useClassroomInventory, useCreateInventoryEvent,
  useSubmitStockTake, useMyStockTakes, useStockTakeItems,
  useClassroomInventoryEvents,
} from '@hooks/useTeacher'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Skeleton } from '@components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/ui/tabs'
import { Badge } from '@components/ui/badge'
import { Archive, Plus, AlertTriangle, ArrowRightLeft, Home, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import type { InventoryItem, StockTakeCondition, InventoryEventType } from '@/types/database'

const CATEGORY_EMOJI: Record<string, string> = {
  furniture: '🪑', equipment: '🔧', book: '📚', toy: '🧸', art_supply: '🎨', other: '📦',
}
const CONDITION_CLASSES: Record<string, string> = {
  good:    'bg-green-50 text-green-700 border-green-200',
  fair:    'bg-amber-50 text-amber-700 border-amber-200',
  damaged: 'bg-red-50 text-red-700 border-red-200',
}
const STOCK_CONDITIONS: StockTakeCondition[] = ['good', 'fair', 'damaged', 'missing']
const EVENT_BADGES: Record<string, { label: string; className: string }> = {
  damage:       { label: 'Damage',    className: 'bg-red-50 text-red-700 border-red-200' },
  transfer:     { label: 'Transfer',  className: 'bg-blue-50 text-blue-700 border-blue-200' },
  home_item:    { label: 'Home Item', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  replenishment:{ label: 'Replenish', className: 'bg-green-50 text-green-700 border-green-200' },
}
const STATUS_CLASSES: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
}

// ── Report Event Dialog ───────────────────────────────────────────────────────
function ReportEventPanel({ item, eventType, schoolId, classroomId, userId, onClose }: {
  item: InventoryItem | null; eventType: InventoryEventType
  schoolId: string; classroomId: string; userId: string; onClose: () => void
}) {
  const [description, setDescription] = useState('')
  const createEvent = useCreateInventoryEvent()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (eventType !== 'home_item' && !description.trim()) { toast.error('Description is required'); return }
    try {
      await createEvent.mutateAsync({
        schoolId, classroomId, itemId: item?.id ?? null,
        eventType, description: description.trim() || undefined, reportedBy: userId,
      })
      toast.success('Event reported')
      onClose()
    } catch (err: any) { toast.error(err.message) }
  }

  const titles: Record<InventoryEventType, string> = {
    damage: '⚠️ Report Damage', transfer: '🔄 Request Transfer',
    home_item: '🏠 Log Home Item', replenishment: '➕ Log Replenishment',
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-slate-800">{titles[eventType]}</p>
        {item && <span className="text-sm text-slate-500">{CATEGORY_EMOJI[item.category]} {item.name}</span>}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={eventType === 'damage' ? 'e.g. Whiteboard is cracked…' : eventType === 'home_item' ? 'e.g. My personal scissors…' : 'Notes…'}
          className="flex-1 h-9"
          autoFocus
        />
        <Button type="submit" size="sm" disabled={createEvent.isPending} className="h-9">Submit</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose} className="h-9">Cancel</Button>
      </form>
    </div>
  )
}

// ── Stock Take Row ────────────────────────────────────────────────────────────
function StockTakeDetailRow({ stockTakeId }: { stockTakeId: string }) {
  const { data: items = [], isLoading } = useStockTakeItems(stockTakeId)
  if (isLoading) return <tr><td colSpan={5} className="px-4 py-2"><Skeleton className="h-6 w-full" /></td></tr>
  return (
    <>
      {items.map((si) => {
        const diff = si.actual_qty - si.expected_qty
        return (
          <tr key={si.id} className="bg-slate-50 border-b border-slate-100 text-sm">
            <td className="pl-12 pr-4 py-2 text-slate-600">
              {CATEGORY_EMOJI[si.item?.category ?? 'other']} {si.item?.name ?? '—'}
            </td>
            <td className="px-4 py-2 text-center text-slate-500">{si.expected_qty}</td>
            <td className="px-4 py-2 text-center font-semibold" style={{ color: diff < 0 ? '#991B1B' : diff > 0 ? '#065F46' : '#64748B' }}>
              {si.actual_qty} {diff !== 0 && <span className="text-xs">({diff > 0 ? '+' : ''}{diff})</span>}
            </td>
            <td className="px-4 py-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${CONDITION_CLASSES[si.condition] ?? ''}`}>{si.condition}</span>
            </td>
            <td className="px-4 py-2 text-xs text-slate-400">{si.notes}</td>
          </tr>
        )
      })}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeacherInventoryPage() {
  const { profile } = useAuthStore()
  const schoolId = profile?.school_id ?? null
  const userId   = profile?.id ?? null

  const [activeReportPanel, setActiveReportPanel] = useState<{ item: InventoryItem | null; type: InventoryEventType } | null>(null)
  const [homeItemOpen, setHomeItemOpen] = useState(false)
  const [expandedTakeId, setExpandedTakeId] = useState<string | null>(null)

  const { data: classroomIds = [] } = useMyClassroomIds()
  const { data: classrooms   = [] } = useMyClassrooms(classroomIds)
  const classroomId = classroomIds[0] ?? null

  const { data: items  = [], isLoading: itemsLoading  } = useClassroomInventory(classroomId)
  const { data: takes  = [], isLoading: takesLoading  } = useMyStockTakes(userId)
  const { data: events = [], isLoading: eventsLoading } = useClassroomInventoryEvents(classroomId)

  // Stock take form state
  const [stockCounts, setStockCounts] = useState<Record<string, { qty: string; condition: StockTakeCondition; notes: string }>>({})
  const [takeNotes, setTakeNotes] = useState('')
  const submitStockTake = useSubmitStockTake()

  const initStockCounts = () => {
    const init: typeof stockCounts = {}
    items.forEach((item) => { init[item.id] = { qty: String(item.quantity), condition: 'good', notes: '' } })
    setStockCounts(init)
    setTakeNotes('')
  }

  const handleSubmitTake = async () => {
    if (!schoolId || !classroomId || !userId) return
    const lineItems = items.map((item) => {
      const c = stockCounts[item.id] ?? { qty: String(item.quantity), condition: 'good' as StockTakeCondition, notes: '' }
      return { itemId: item.id, expectedQty: item.quantity, actualQty: parseInt(c.qty) || 0, condition: c.condition, notes: c.notes.trim() || undefined }
    })
    try {
      await submitStockTake.mutateAsync({ schoolId, classroomId, submittedBy: userId, notes: takeNotes.trim() || undefined, items: lineItems })
      toast.success('Stock take submitted — admin will review it')
    } catch (err: any) { toast.error(err.message) }
  }

  const classroomName = classrooms[0]?.name ?? 'your class'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <Archive size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">{classroomName} · {items.length} item{items.length !== 1 ? 's' : ''} assigned</p>
        </div>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="stock_take">Stock Take</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        {/* ── Items ── */}
        <TabsContent value="items" className="mt-4 space-y-3">
          {activeReportPanel && schoolId && classroomId && userId && (
            <ReportEventPanel
              item={activeReportPanel.item}
              eventType={activeReportPanel.type}
              schoolId={schoolId}
              classroomId={classroomId}
              userId={userId}
              onClose={() => setActiveReportPanel(null)}
            />
          )}
          {homeItemOpen && schoolId && classroomId && userId && (
            <ReportEventPanel
              item={null}
              eventType="home_item"
              schoolId={schoolId}
              classroomId={classroomId}
              userId={userId}
              onClose={() => setHomeItemOpen(false)}
            />
          )}

          {itemsLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : items.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
              <p className="text-3xl mb-3">🗂️</p>
              <p className="font-semibold text-slate-700">No items assigned</p>
              <p className="text-sm text-slate-400 mt-1">Your school admin will assign inventory items to your classroom.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setHomeItemOpen(true)} className="gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50">
                  <Home size={14} /> Log Home Item
                </Button>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Serial #</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Condition</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{CATEGORY_EMOJI[item.category]}</span>
                            <div>
                              <p className="font-medium text-slate-800">{item.name}</p>
                              {item.is_consumable && <p className="text-xs text-purple-600">🎨 Consumable</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{item.serial_number ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-xs">×{item.quantity}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${CONDITION_CLASSES[item.condition] ?? ''}`}>
                            {item.condition}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 justify-end">
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 text-xs text-red-600 hover:bg-red-50 gap-1"
                              onClick={() => setActiveReportPanel({ item, type: 'damage' })}
                            >
                              <AlertTriangle size={12} /> Damage
                            </Button>
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 text-xs text-blue-600 hover:bg-blue-50 gap-1"
                              onClick={() => setActiveReportPanel({ item, type: 'transfer' })}
                            >
                              <ArrowRightLeft size={12} /> Transfer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Stock Take ── */}
        <TabsContent value="stock_take" className="mt-4 space-y-4">
          {items.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
              <p className="text-sm text-slate-400">No items assigned yet. Stock takes require items in your classroom.</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                📋 Count each item and record the actual quantity and condition. Your admin will receive this for review.
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Expected</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Actual Count</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const c = stockCounts[item.id] ?? { qty: String(item.quantity), condition: 'good' as StockTakeCondition, notes: '' }
                      const actualQty = parseInt(c.qty) || 0
                      const diff = actualQty - item.quantity
                      return (
                        <tr key={item.id} className={diff < 0 ? 'bg-red-50/30' : 'hover:bg-slate-50'}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{CATEGORY_EMOJI[item.category]}</span>
                              <span className="font-medium text-slate-800">{item.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500">{item.quantity}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Input
                                type="number"
                                min={0}
                                value={c.qty}
                                onChange={(e) => setStockCounts((prev) => ({ ...prev, [item.id]: { ...prev[item.id] ?? { condition: 'good', notes: '' }, qty: e.target.value } }))}
                                className="w-20 h-8 text-center text-sm font-bold"
                                onClick={initStockCounts}
                              />
                              {diff !== 0 && (
                                <span className={`text-xs font-bold ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {diff > 0 ? `+${diff}` : diff}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {STOCK_CONDITIONS.map((cond) => (
                                <button
                                  key={cond}
                                  onClick={() => setStockCounts((prev) => ({ ...prev, [item.id]: { ...prev[item.id] ?? { qty: String(item.quantity), notes: '' }, condition: cond } }))}
                                  className={`px-2 py-0.5 rounded text-xs font-semibold border transition-all ${
                                    c.condition === cond
                                      ? (CONDITION_CLASSES[cond] ?? 'bg-slate-100 text-slate-600 border-slate-200')
                                      : 'bg-white text-slate-300 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  {cond.charAt(0).toUpperCase() + cond.slice(1)}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Overall Notes (optional)</label>
                <Input
                  value={takeNotes}
                  onChange={(e) => setTakeNotes(e.target.value)}
                  placeholder="Any general comments for the admin…"
                />
              </div>

              <Button
                onClick={handleSubmitTake}
                disabled={submitStockTake.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {submitStockTake.isPending ? 'Submitting…' : '📋 Submit Stock Take'}
              </Button>
            </>
          )}
        </TabsContent>

        {/* ── Events ── */}
        <TabsContent value="events" className="mt-4 space-y-3">
          {eventsLoading || takesLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : events.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
              <p className="text-3xl mb-3">🔔</p>
              <p className="font-semibold text-slate-700">No events yet</p>
              <p className="text-sm text-slate-400 mt-1">Damage reports, transfer requests, and home items will appear here.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {events.map((event) => {
                const badge = EVENT_BADGES[event.event_type] ?? EVENT_BADGES.home_item
                const statusClass = STATUS_CLASSES[event.status] ?? STATUS_CLASSES.pending
                return (
                  <div key={event.id} className="flex items-start gap-3 px-4 py-3">
                    <span className={`mt-0.5 text-xs px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${badge.className}`}>
                      {badge.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm">
                        {(event as any).item?.name ?? event.description ?? 'Item'}
                      </p>
                      {event.description && <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>}
                      {(event as any).target && <p className="text-xs text-blue-600 mt-0.5">→ {(event as any).target.name}</p>}
                      <p className="text-xs text-slate-400 mt-1">{format(new Date(event.created_at), 'MMM d, yyyy · h:mm a')}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${statusClass}`}>
                      {event.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Past stock takes */}
          {takes.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Past Stock Takes</p>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {takes.map((take) => (
                  <div key={take.id}>
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
                      onClick={() => setExpandedTakeId(expandedTakeId === take.id ? null : take.id)}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{(take as any).classroom?.name ?? 'Classroom'}</p>
                        <p className="text-xs text-slate-400">{format(new Date(take.submitted_at), 'MMM d, yyyy · h:mm a')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${take.status === 'reviewed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {take.status === 'reviewed' ? '✓ Reviewed' : 'Pending'}
                        </span>
                        {expandedTakeId === take.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>
                    {expandedTakeId === take.id && (
                      <table className="w-full text-xs border-t border-slate-100">
                        <thead><tr className="bg-slate-50">
                          <th className="text-left px-4 py-2 font-medium text-slate-500">Item</th>
                          <th className="text-center px-3 py-2 font-medium text-slate-500">Expected</th>
                          <th className="text-center px-3 py-2 font-medium text-slate-500">Actual</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-500">Condition</th>
                          <th className="text-left px-3 py-2 font-medium text-slate-500">Notes</th>
                        </tr></thead>
                        <tbody>
                          <StockTakeDetailRow stockTakeId={take.id} />
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
