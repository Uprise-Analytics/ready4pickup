'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useAuthStore } from '@store/auth.store'
import {
  usePendingPlanSubmissions,
  useApproveSubmission,
  useRejectSubmission,
} from '@hooks/useAssessments'
import { ClipboardCheck, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

function RejectModal({
  submissionId, planName, submittedBy, schoolId, rejectedBy, onClose,
}: {
  submissionId: string
  planName: string
  submittedBy: string
  schoolId: string
  rejectedBy: string
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const { mutateAsync: rejectSub, isPending } = useRejectSubmission()

  const handleReject = async () => {
    await rejectSub({
      submissionId,
      schoolId,
      rejectedBy,
      submittedBy,
      planName,
      rejectionReason: reason || undefined,
    })
    toast.success(`"${planName}" rejected`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Reject Plan</h2>
        <p className="text-sm text-slate-500 mb-4">Optionally tell the teacher why this plan needs revision.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)…"
          rows={3}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <div className="flex gap-3">
          <button onClick={handleReject} disabled={isPending}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm">
            {isPending ? 'Rejecting…' : 'Reject Plan'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function SubmissionCard({
  submission, onApprove, onReject, approving,
}: {
  submission: any
  onApprove: () => void
  onReject: () => void
  approving: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const items: any[] = submission.items ?? []

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-800">{submission.name}</p>
            {submission.term && (
              <span className="text-xs font-medium text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">{submission.term}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span>📚 {items.length} item{items.length !== 1 ? 's' : ''}</span>
            {submission.classroom?.name && <span>🏫 {submission.classroom.name}</span>}
            {submission.submitter?.full_name && <span>👤 {submission.submitter.full_name}</span>}
            <span>🕒 {format(parseISO(submission.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded border border-slate-200">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide' : 'Items'}
          </button>
          <button
            onClick={onApprove}
            disabled={approving}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
          >
            <CheckCircle2 size={13} /> Approve All
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200"
          >
            <XCircle size={13} /> Reject
          </button>
        </div>
      </div>

      {expanded && items.length > 0 && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {items.map((item: any, idx: number) => (
            <div key={item.id} className="px-5 py-3 flex items-start gap-3">
              <span className="text-xs font-bold text-slate-400 w-5 mt-0.5">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{item.name}</p>
                {item.criteria && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.criteria}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.development_area && (
                  <span className="text-xs text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full capitalize">
                    {item.development_area.replace('_', ' ')}
                  </span>
                )}
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full capitalize">{item.frequency}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AssessmentPlanApprovalsPage() {
  const { profile } = useAuthStore()
  const schoolId = profile?.school_id ?? null
  const [rejectTarget, setRejectTarget] = useState<{ submissionId: string; planName: string; submittedBy: string } | null>(null)

  const { data: pending = [], isLoading } = usePendingPlanSubmissions(schoolId)
  const { mutateAsync: approveSubmission, isPending: approving } = useApproveSubmission()

  const handleApprove = async (sub: any) => {
    await approveSubmission({
      submissionId: sub.id,
      schoolId: sub.school_id,
      approvedBy: profile!.id,
      submittedBy: sub.submitted_by ?? '',
      planName: sub.name,
    })
    toast.success(`"${sub.name}" approved — ${sub.items?.length ?? 0} plans are now active`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardCheck size={24} className="text-teal-600" />
          Plan Approvals
          {pending.length > 0 && (
            <span className="ml-1 text-sm font-bold bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Review and approve multi-item assessment plans submitted by teachers.</p>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading…</div>
      ) : pending.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle2 size={48} className="text-green-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-600 text-lg">All clear!</p>
          <p className="text-sm text-slate-400 mt-1">No plans are waiting for your approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((sub: any) => (
            <SubmissionCard
              key={sub.id}
              submission={sub}
              approving={approving}
              onApprove={() => handleApprove(sub)}
              onReject={() => setRejectTarget({ submissionId: sub.id, planName: sub.name, submittedBy: sub.submitted_by ?? '' })}
            />
          ))}
        </div>
      )}

      {rejectTarget && schoolId && profile?.id && (
        <RejectModal
          submissionId={rejectTarget.submissionId}
          planName={rejectTarget.planName}
          submittedBy={rejectTarget.submittedBy}
          schoolId={schoolId}
          rejectedBy={profile.id}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  )
}
