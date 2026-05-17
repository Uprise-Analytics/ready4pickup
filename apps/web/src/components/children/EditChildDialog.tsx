'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@components/ui/dialog'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@components/ui/select'
import { useUpdateChild, useSchoolClassrooms } from '@hooks/useSchoolAdmin'
import type { Child } from '@/types/database'

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  grade: z.string().optional(),
  classroomId: z.string().optional(),
  allergies: z.string().optional(),
  medicalNotes: z.string().optional(),
  wearsDiapers: z.boolean(),
  drinksBottle: z.boolean(),
  isActive: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface Props {
  child: Child | null
  schoolId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditChildDialog({ child, schoolId, open, onOpenChange }: Props) {
  const { mutateAsync, isPending } = useUpdateChild()
  const { data: classrooms = [] } = useSchoolClassrooms(schoolId || null)

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', grade: '', classroomId: '', allergies: '', medicalNotes: '', wearsDiapers: false, drinksBottle: false, isActive: true },
  })

  useEffect(() => {
    if (child) {
      reset({
        firstName: child.first_name,
        lastName: child.last_name,
        grade: child.grade ?? '',
        classroomId: child.classroom_id ?? '',
        allergies: child.allergies?.join(', ') ?? '',
        medicalNotes: child.medical_notes ?? '',
        wearsDiapers: child.wears_diapers,
        drinksBottle: child.drinks_bottle,
        isActive: child.is_active,
      })
    }
  }, [child, reset])

  async function onSubmit(values: FormData) {
    if (!child) return
    const allergiesArr = values.allergies
      ? values.allergies.split(',').map((a) => a.trim()).filter(Boolean)
      : []
    const selectedClassroom = classrooms.find((c) => c.id === values.classroomId)
    try {
      await mutateAsync({
        id: child.id,
        schoolId: child.school_id,
        firstName: values.firstName,
        lastName: values.lastName,
        grade: values.grade || null,
        classroomId: values.classroomId || null,
        classroom: selectedClassroom?.name ?? null,
        allergies: allergiesArr,
        medicalNotes: values.medicalNotes || null,
        wearsDiapers: values.wearsDiapers,
        drinksBottle: values.drinksBottle,
        isActive: values.isActive,
      })
      toast.success('Child updated')
      onOpenChange(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update child')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Child</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ec-firstName">First Name</Label>
              <Input id="ec-firstName" {...register('firstName')} />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-lastName">Last Name</Label>
              <Input id="ec-lastName" {...register('lastName')} />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ec-grade">Grade</Label>
              <Input id="ec-grade" {...register('grade')} placeholder="e.g. Grade 1" />
            </div>
            <div className="space-y-1.5">
              <Label>Classroom</Label>
              <Select value={watch('classroomId') ?? ''} onValueChange={(v) => setValue('classroomId', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {classrooms.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ec-allergies">Allergies</Label>
            <Input id="ec-allergies" {...register('allergies')} placeholder="Peanuts, Dairy (comma separated)" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ec-medical">Medical Notes</Label>
            <Input id="ec-medical" {...register('medicalNotes')} placeholder="Any medical conditions or notes" />
          </div>

          <div className="flex flex-col gap-2.5">
            {([
              ['wearsDiapers', 'Wears diapers'],
              ['drinksBottle', 'Drinks bottle'],
              ['isActive', 'Active enrollment'],
            ] as const).map(([field, label]) => (
              <label key={field} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={watch(field)}
                  onChange={(e) => setValue(field, e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
