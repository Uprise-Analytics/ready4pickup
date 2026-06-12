'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useAuthStore } from '@store/auth.store'
import { usePendingApprovalPlans, useApprovePlan, useRejectPlan } from '@hooks/useAssessments'
import { ClipboardCheck, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

function RejectModal({
  planId, planName, teacherId, schoolId, rejectedBy, onClose,
}: {
  planId: string; planName: string; teacherId: string
  schoolId: string; rejectedBy: string; onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const { mutateAsync: rejectPlan, isPending } = useRejectPlan()

  const handleReject = async () => {
    await rejectPlan({ planId, schoolId, rejectedBy, teacherId, planName, rejectionReason: reason || undefined })
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

export default function AssessmentPlanApprovalsPage() {
  const { profile } = useAuthStore()
  const schoolId = profile?.school_id ?? null
  const [rejectTarget, setRejectTarget] = useState<{ planId: string; planName: string; teacherId: string } | null>(null)

  const { data: pending = [], isLoading } = usePendingApprovalPlans(schoolId)
  const { mutateAsync: approvePlan, isPending: approving } = useApprovePlan()

  const handleApprove = async (plan: any) => {
    await approvePlan({
      planId: plan.id,
      schoolId: plan.school_id,
      approvedBy: profile!.id,
      teacherId: plan.created_by,
      planName: plan.name,
    })
    toast.success(`"${plan.name}" approved`)
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
        <p className="text-sm text-slate-500 mt-1">Review and approve assessment plans submitted by teachers.</p>
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
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Plan</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Classroom</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Teacher</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Frequency</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pending.map((plan: any) => (
                <tr key={plan.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800">{plan.name}</p>
                    {plan.development_area && (
                      <span className="text-xs text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full capitalize">
                        {plan.development_area.replace('_', ' ')}
                      </span>
                    )}
                    {plan.criteria && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{plan.criteria}</p>}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{plan.classroom?.name ?? '—'}</td>
                  <td className="px-4 py-4 text-slate-600">{plan.creator?.full_name ?? '—'}</td>
                  <td className="px-4 py-4">
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full capitalize">{plan.frequency}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-400 text-xs">{format(parseISO(plan.created_at), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleApprove(plan)}
                        disabled={approving}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
                      >
                        <CheckCircle2 size={13} /> Approve
                      </button>
                      <button
                        onClick={() => setRejectTarget({ planId: plan.id, planName: plan.name, teacherId: plan.created_by })}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200"
                      >
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejectTarget && schoolId && profile?.id && (
        <RejectModal
          planId={rejectTarget.planId}
          planName={rejectTarget.planName}
          teacherId={rejectTarget.teacherId}
          schoolId={schoolId}
          rejectedBy={profile.id}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  )
}
