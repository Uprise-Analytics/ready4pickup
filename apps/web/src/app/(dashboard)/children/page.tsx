'use client'

import { useState } from 'react'
import { useAuthStore } from '@store/auth.store'
import { useSchoolChildren } from '@hooks/useSchoolAdmin'
import { ChildrenTable } from '@components/children/ChildrenTable'
import { AddChildDialog } from '@components/children/AddChildDialog'
import { EditChildDialog } from '@components/children/EditChildDialog'
import { ClassroomsList } from '@components/children/ClassroomsList'
import { Button } from '@components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/ui/tabs'
import { Skeleton } from '@components/ui/skeleton'
import { Baby, Plus, BookOpen } from 'lucide-react'
import type { Child } from '@/types/database'

export default function ChildrenPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [editChild, setEditChild] = useState<Child | null>(null)
  const profile = useAuthStore((s) => s.profile)
  const schoolId = profile?.school_id ?? ''

  const { data: children = [], isLoading } = useSchoolChildren(schoolId)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center">
            <Baby size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Children</h1>
            <p className="text-sm text-slate-500">{children.length} enrolled</p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={15} className="mr-1" />
          Add Child
        </Button>
      </div>

      <Tabs defaultValue="children">
        <TabsList>
          <TabsTrigger value="children" className="flex items-center gap-1.5">
            <Baby size={14} /> Children
          </TabsTrigger>
          <TabsTrigger value="classrooms" className="flex items-center gap-1.5">
            <BookOpen size={14} /> Classrooms
          </TabsTrigger>
        </TabsList>

        <TabsContent value="children" className="mt-4">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ChildrenTable children={children} onEdit={setEditChild} />
          )}
        </TabsContent>

        <TabsContent value="classrooms" className="mt-4">
          <ClassroomsList schoolId={schoolId} />
        </TabsContent>
      </Tabs>

      <AddChildDialog open={addOpen} onOpenChange={setAddOpen} schoolId={schoolId} />
      <EditChildDialog
        child={editChild}
        schoolId={schoolId}
        open={!!editChild}
        onOpenChange={(o) => { if (!o) setEditChild(null) }}
      />
    </div>
  )
}
