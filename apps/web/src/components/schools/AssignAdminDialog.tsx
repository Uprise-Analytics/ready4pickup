'use client'

import { useState } from 'react'
import { useUpdateUserRole } from '@hooks/useAdmin'
import { Button } from '@components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@components/ui/dialog'
import { toast } from 'sonner'
import { getInitials, getAvatarColor } from '@utils/format'
import type { Profile } from '@/types/database'

interface Props {
  schoolId: string
  members: Profile[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignAdminDialog({ schoolId, members, open, onOpenChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { mutateAsync: updateRole, isPending } = useUpdateUserRole()

  const eligible = members.filter(m => m.role !== 'school_admin' && m.is_active)

  async function handleAssign() {
    if (!selectedId) return
    try {
      await updateRole({ userId: selectedId, role: 'school_admin', schoolId })
      toast.success('Admin assigned successfully')
      setSelectedId(null)
      onOpenChange(false)
    } catch {
      toast.error('Failed to assign admin')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSelectedId(null); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign School Admin</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {eligible.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No eligible members. Add staff to this school first.
            </p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {eligible.map((member) => {
                const initials = getInitials(member.full_name)
                const avatarColor = getAvatarColor(member.full_name)
                const isSelected = selectedId === member.id
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedId(isSelected ? null : member.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.full_name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{member.full_name}</p>
                      <p className="text-xs text-slate-400 truncate">{member.email}</p>
                    </div>
                    <span className="text-xs text-slate-400 capitalize">{member.role}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setSelectedId(null); onOpenChange(false) }}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!selectedId || isPending}>
            {isPending ? 'Assigning…' : 'Assign Admin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
