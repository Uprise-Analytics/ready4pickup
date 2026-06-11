'use client'

import { useState, useRef } from 'react'
import { useAuthStore } from '@store/auth.store'
import { useStaffCertificates, useCreateStaffCertificate, useDeleteStaffCertificate, useAllUsers } from '@hooks/useAdmin'
import { getCertStatus } from '@/types/database'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { toast } from 'sonner'
import { ShieldCheck, Plus, Trash2, ExternalLink, X } from 'lucide-react'
import { differenceInDays } from 'date-fns'

const CERT_TYPES = [
  { value: 'first_aid',           label: 'First Aid' },
  { value: 'child_protection',    label: 'Child Protection' },
  { value: 'food_safety',         label: 'Food Safety' },
  { value: 'fire_safety',         label: 'Fire Safety' },
  { value: 'manual_handling',     label: 'Manual Handling' },
  { value: 'health_safety',       label: 'Health & Safety' },
  { value: 'dbs_check',           label: 'DBS Check' },
  { value: 'emergency_first_aid', label: 'Emergency First Aid' },
  { value: 'other',               label: 'Other' },
]

type FilterTab = 'all' | 'valid' | 'expiring_soon' | 'expired'

function StatusBadge({ expiryDate }: { expiryDate: string }) {
  const status = getCertStatus(expiryDate)
  const daysLeft = differenceInDays(new Date(expiryDate), new Date())
  if (status === 'expired') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Expired</span>
  }
  if (status === 'expiring_soon') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Expires in {daysLeft}d</span>
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Valid</span>
}

export default function StaffCertificatesPage() {
  const { profile } = useAuthStore()
  const schoolId = profile?.school_id ?? ''
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [showDialog, setShowDialog] = useState(false)

  const { data: certs = [], isLoading } = useStaffCertificates(schoolId)
  const { mutateAsync: deleteCert } = useDeleteStaffCertificate()

  const filtered = certs.filter(c => {
    if (activeTab === 'all') return true
    return getCertStatus(c.expiry_date) === activeTab
  })

  const counts = {
    all: certs.length,
    valid: certs.filter(c => getCertStatus(c.expiry_date) === 'valid').length,
    expiring_soon: certs.filter(c => getCertStatus(c.expiry_date) === 'expiring_soon').length,
    expired: certs.filter(c => getCertStatus(c.expiry_date) === 'expired').length,
  }

  async function handleDelete(id: string) {
    try {
      await deleteCert(id)
      toast.success('Certificate removed')
    } catch { toast.error('Failed to remove certificate') }
  }

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'valid', label: `Valid (${counts.valid})` },
    { key: 'expiring_soon', label: `Expiring Soon (${counts.expiring_soon})` },
    { key: 'expired', label: `Expired (${counts.expired})` },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff Certificates</h1>
            <p className="text-sm text-slate-500">Track health & safety certificates and expiry dates</p>
          </div>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus size={16} />
          Add Certificate
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading certificates…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-slate-400 py-12 text-center">
          {activeTab === 'all' ? 'No certificates added yet. Click "Add Certificate" to get started.' : `No ${activeTab.replace('_', ' ')} certificates.`}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Staff Member</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Certificate</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Expiry</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(cert => (
                <tr key={cert.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{cert.staff.full_name}</td>
                  <td className="px-4 py-3 text-slate-700">{cert.title}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {CERT_TYPES.find(t => t.value === cert.certificate_type)?.label ?? cert.certificate_type}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(cert.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge expiryDate={cert.expiry_date} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {cert.file_url && (
                        <a
                          href={cert.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View file"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(cert.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDialog && (
        <AddCertificateDialog
          schoolId={schoolId}
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  )
}

function AddCertificateDialog({ schoolId, onClose }: { schoolId: string; onClose: () => void }) {
  const { data: users = [] } = useAllUsers({ schoolId })
  const { mutateAsync: createCert, isPending } = useCreateStaffCertificate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [staffId, setStaffId] = useState('')
  const [certType, setCertType] = useState('')
  const [title, setTitle] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const staffOptions = users.filter(u => u.role === 'school_admin' || u.role === 'teacher')

  async function handleSubmit() {
    if (!staffId) { toast.error('Please select a staff member'); return }
    if (!certType) { toast.error('Please select a certificate type'); return }
    if (!title.trim()) { toast.error('Please enter a title'); return }
    if (!expiryDate) { toast.error('Please select an expiry date'); return }
    try {
      await createCert({ staff_id: staffId, title: title.trim(), certificate_type: certType, expiry_date: expiryDate, notes: notes || undefined, file: file ?? undefined })
      toast.success('Certificate added')
      onClose()
    } catch { toast.error('Failed to add certificate') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Add Certificate</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Staff selector */}
          <div className="space-y-1.5">
            <Label>Staff Member</Label>
            <select
              value={staffId}
              onChange={e => setStaffId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select staff member…</option>
              {staffOptions.map(u => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.role === 'school_admin' ? 'Admin' : 'Teacher'})</option>
              ))}
            </select>
          </div>

          {/* Cert type pills */}
          <div className="space-y-1.5">
            <Label>Certificate Type</Label>
            <div className="flex flex-wrap gap-2">
              {CERT_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setCertType(t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    certType === t.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="cert-title">Title</Label>
            <Input id="cert-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. First Aid Level 2" />
          </div>

          {/* Expiry date */}
          <div className="space-y-1.5">
            <Label htmlFor="cert-expiry">Expiry Date</Label>
            <input
              id="cert-expiry"
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* File upload */}
          <div className="space-y-1.5">
            <Label>Certificate File <span className="text-slate-400 font-normal">(optional)</span></Label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <p className="text-sm text-blue-700 font-medium">{file.name}</p>
              ) : (
                <p className="text-sm text-slate-400">Click to upload PDF, JPG, or PNG</p>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="cert-notes">Notes <span className="text-slate-400 font-normal">(optional)</span></Label>
            <textarea
              id="cert-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Any additional notes…"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Adding…' : 'Add Certificate'}
          </Button>
        </div>
      </div>
    </div>
  )
}
