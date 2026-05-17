'use client'

import { useState } from 'react'
import { useAuthStore } from '@store/auth.store'
import { useAllUsers } from '@hooks/useAdmin'
import { PeopleTable } from '@components/people/PeopleTable'
import { CreateUserDialog } from '@components/people/CreateUserDialog'
import { EditUserDialog } from '@components/people/EditUserDialog'
import { Button } from '@components/ui/button'
import { Skeleton } from '@components/ui/skeleton'
import { Users, UserPlus } from 'lucide-react'
import type { Profile } from '@/types/database'

export default function PeoplePage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const profile = useAuthStore((s) => s.profile)
  const schoolId = profile?.school_id ?? ''

  const { data: users = [], isLoading } = useAllUsers({ schoolId })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <Users size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">People</h1>
            <p className="text-sm text-slate-500">{users.length} member{users.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus size={15} className="mr-1" />
          Add Member
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <PeopleTable users={users} schoolId={schoolId} onEdit={setEditUser} />
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} schoolId={schoolId} />
      <EditUserDialog
        user={editUser}
        open={!!editUser}
        onOpenChange={(o) => { if (!o) setEditUser(null) }}
      />
    </div>
  )
}
