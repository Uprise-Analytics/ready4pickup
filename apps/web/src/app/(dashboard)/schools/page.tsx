'use client'

import { useState } from 'react'
import { useAllSchools } from '@hooks/useAdmin'
import { SchoolsTable } from '@components/schools/SchoolsTable'
import { CreateSchoolDialog } from '@components/schools/CreateSchoolDialog'
import { Button } from '@components/ui/button'
import { Skeleton } from '@components/ui/skeleton'
import { School, Plus } from 'lucide-react'

export default function SchoolsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data: schools = [], isLoading } = useAllSchools()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <School size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Schools</h1>
            <p className="text-sm text-slate-500">{schools.length} school{schools.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus size={15} className="mr-1" />
          New School
        </Button>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : <SchoolsTable schools={schools} />}

      <CreateSchoolDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
