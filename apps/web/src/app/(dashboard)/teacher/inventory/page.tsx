'use client'

import { useState, useMemo } from 'react'
import { useAuthStore } from '@store/auth.store'
import {
  useMyClassroomIds, useMyClassrooms,
  useClassroomInventory, useCreateInventoryEvent,
  useSubmitStockTake, useMyStockTakes, useStockTakeItems,
  useClassroomInventoryEvents,
  useSchoolInventoryAll, useMyOutgoingLoans, useMyIncomingLoans,
  useRequestLoan, useRespondToLoan, useReturnLoan,
} from '@hooks/useTeacher'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Skeleton } from '@components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/ui/tabs'
import { Badge } from '@components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog'
import { Archive, Plus, AlertTriangle, ArrowRightLeft, Home, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
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

  const { data: items       = [], isLoading: itemsLoading  } = useClassroomInventory(classroomId)
  const { data: takes       = [], isLoading: takesLoading  } = useMyStockTakes(userId)
  const { data: events      = [], isLoading: eventsLoading } = useClassroomInventoryEvents(classroomId)
  const { data: outgoingLoans = [], isLoading: outLoading   } = useMyOutgoingLoans(classroomId)
  const { data: incomingLoans = [], isLoading: inLoading    } = useMyIncomingLoans(classroomId)
  const { data: schoolItems   = [], isLoading: schoolItemsLoading } = useSchoolInventoryAll(schoolId, classroomId)
  const requestLoan   = useRequestLoan()
  const respondToLoan = useRespondToLoan()
  const returnLoan    = useReturnLoan()

  const [showBorrowDialog, setShowBorrowDialog] = useState(false)
  const [borrowItem, setBorrowItem] = useState<(typeof schoolItems)[0] | null>(null)
  const [borrowQty, setBorrowQty]   = useState('1')
  const [borrowNote, setBorrowNote] = useState('')

  const lentQtyMap = useMemo(() => {
    const m = new Map<string, number>()
    incomingLoans.filter((l) => l.status === 'active').forEach((l) => {
      m.set(l.item_id, (m.get(l.item_id) ?? 0) + l.qty)
    })
    return m
  }, [incomingLoans])

  const pendingIncoming = incomingLoans.filter((l) => l.status === 'pending').length

  const handleRequestLoan = async () => {
    if (!schoolId || !classroomId || !userId || !borrowItem) return
    try {
      await requestLoan.mutateAsync({
        schoolId, itemId: borrowItem.id, qty: parseInt(borrowQty) || 1,
        fromClassroomId: (borrowItem as any).classroom_id,
        toClassroomId: classroomId,
        requestedBy: userId,
        notes: borrowNote.trim() || undefined,
      })
      toast.success('Request sent — the other teacher will be notified')
      setShowBorrowDialog(false); setBorrowItem(null); setBorrowQty('1'); setBorrowNote('')
    } catch (e: any) { toast.error(e.message) }
  }

  // Stock take form state
  const [stockCounts, setStockCounts] = useState<Record<string, { qty: string; condition: StockTakeCondition; notes: string }>>({})
  const [takeNotes, setTakeNotes] = useState('')
  const submitStockTake = useSubmitStockTake()

  // Stock counts start empty — teacher counts what they physically see

  const handleSubmitTake = async () => {
    if (!schoolId || !classroomId || !userId) return
    const lineItems = items.map((item) => {
      const c = stockCounts[item.id] ?? { qty: '', condition: 'good' as StockTakeCondition, notes: '' }
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
          <TabsTrigger value="loans" className="relative">
            Loans
            {pendingIncoming > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingIncoming}</span>
            )}
          </TabsTrigger>
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
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-xs">×{item.quantity}</span>
                            {lentQtyMap.get(item.id) ? (
                              <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs">Lent: {lentQtyMap.get(item.id)}</span>
                            ) : null}
                          </div>
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
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">Your Count</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const c = stockCounts[item.id] ?? { qty: '', condition: 'good' as StockTakeCondition, notes: '' }
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{CATEGORY_EMOJI[item.category]}</span>
                              <div>
                                <span className="font-medium text-slate-800">{item.name}</span>
                                {item.serial_number && <p className="text-xs text-slate-400">#{item.serial_number}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Input
                              type="number"
                              min={0}
                              value={c.qty}
                              placeholder="0"
                              onChange={(e) => setStockCounts((prev) => ({ ...prev, [item.id]: { ...prev[item.id] ?? { condition: 'good', notes: '' }, qty: e.target.value } }))}
                              className="w-24 h-8 text-center text-sm font-bold mx-auto"
                            /></td>
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

        {/* ── Loans ── */}
        <TabsContent value="loans" className="mt-4 space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowBorrowDialog(true)} className="gap-1.5 bg-teal-600 hover:bg-teal-700">
              <RefreshCw size={15} /> Borrow from Another Class
            </Button>
          </div>

          {/* Incoming */}
          {(inLoading || outLoading) ? (
            <div className="space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-14 w-full"/>)}</div>
          ) : (
            <>
              {incomingLoans.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Incoming Requests ({pendingIncoming} pending)</p>
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {incomingLoans.map((loan) => (
                      <div key={loan.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-xl">{CATEGORY_EMOJI[(loan as any).item?.category ?? 'other']}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 text-sm">{(loan as any).item?.name ?? 'Item'}</p>
                          <p className="text-xs text-slate-500">{(loan as any).to_classroom?.name} wants ×{loan.qty}{loan.notes ? ` — "${loan.notes}"` : ''}</p>
                        </div>
                        {loan.status === 'pending' ? (
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600 hover:bg-red-50"
                              onClick={() => respondToLoan.mutate({id:loan.id,status:'rejected',approvedBy:userId!,fromClassroomId:loan.from_classroom_id,toClassroomId:loan.to_classroom_id},{onSuccess:()=>toast.success('Declined')})}>
                              ✕ Decline
                            </Button>
                            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              onClick={() => respondToLoan.mutate({id:loan.id,status:'active',approvedBy:userId!,fromClassroomId:loan.from_classroom_id,toClassroomId:loan.to_classroom_id},{onSuccess:()=>toast.success('Approved!')})}>
                              ✓ Approve
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-50 text-green-700">Active</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {outgoingLoans.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">My Requests</p>
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {outgoingLoans.map((loan) => (
                      <div key={loan.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-xl">{CATEGORY_EMOJI[(loan as any).item?.category ?? 'other']}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 text-sm">{(loan as any).item?.name ?? 'Item'}</p>
                          <p className="text-xs text-slate-500">From: {(loan as any).from_classroom?.name} · ×{loan.qty} · {format(new Date(loan.requested_at), 'MMM d')}</p>
                        </div>
                        {loan.status === 'active' ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => returnLoan.mutate({id:loan.id,fromClassroomId:loan.from_classroom_id,toClassroomId:loan.to_classroom_id},{onSuccess:()=>toast.success('Marked as returned')})}>
                            ↩ Return
                          </Button>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700">Pending</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {incomingLoans.length === 0 && outgoingLoans.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
                  <RefreshCw size={32} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-semibold text-slate-600">No active loans</p>
                  <p className="text-sm text-slate-400 mt-1">Borrow items from other classes or approve incoming requests here.</p>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Borrow dialog */}
      <Dialog open={showBorrowDialog} onOpenChange={(o) => { setShowBorrowDialog(o); if (!o) { setBorrowItem(null); setBorrowQty('1'); setBorrowNote('') } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{borrowItem ? `Request: ${(borrowItem as any).name}` : 'Borrow from Another Class'}</DialogTitle>
          </DialogHeader>
          {borrowItem ? (
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-800">
                <span className="font-semibold">{CATEGORY_EMOJI[(borrowItem as any).category]} {(borrowItem as any).name}</span>
                {' '}from <span className="font-semibold">{(borrowItem as any).classroom?.name ?? 'Unknown'}</span>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Quantity</label>
                <Input type="number" min={1} value={borrowQty} onChange={(e)=>setBorrowQty(e.target.value)} className="w-24 h-8 text-center" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Note (optional)</label>
                <Input value={borrowNote} onChange={(e)=>setBorrowNote(e.target.value)} placeholder="e.g. for art class tomorrow…" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="ghost" onClick={() => setBorrowItem(null)}>Back</Button>
                <Button onClick={handleRequestLoan} disabled={requestLoan.isPending} className="flex-1 bg-teal-600 hover:bg-teal-700">
                  {requestLoan.isPending ? 'Sending…' : 'Send Request'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {schoolItemsLoading ? (
                <div className="space-y-2">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-12 w-full"/>)}</div>
              ) : schoolItems.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No items available from other classes.</p>
              ) : schoolItems.map((si) => (
                <button key={si.id} onClick={() => { setBorrowItem(si); setBorrowQty('1') }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-left">
                  <span className="text-lg">{CATEGORY_EMOJI[si.category]}</span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 text-sm">{si.name}</p>
                    <p className="text-xs text-slate-400">🏫 {(si as any).classroom?.name ?? 'Unassigned'} · ×{si.quantity}</p>
                  </div>
                  <span className="text-xs text-teal-600 font-semibold">Request →</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
