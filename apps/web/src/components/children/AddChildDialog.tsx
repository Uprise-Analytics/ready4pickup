'use client'

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
import { useAddChild } from '@hooks/useSchoolAdmin'
import { useAuthStore } from '@store/auth.store'

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  dateOfBirth: z.string().optional(),
  classroom: z.string().optional(),
  grade: z.string().optional(),
  allergies: z.string().optional(),
  medicalNotes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  schoolId: string
}

export function AddChildDialog({ open, onOpenChange, schoolId }: Props) {
  const profile = useAuthStore((s) => s.profile)
  const { mutateAsync, isPending } = useAddChild()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormData) {
    try {
      await mutateAsync({
        schoolId,
        createdBy: profile!.id,
        studentId: crypto.randomUUID().slice(0, 8).toUpperCase(),
        firstName: values.firstName,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth ?? null,
        classroom: values.classroom ?? null,
        classroomId: null,
        grade: values.grade ?? null,
        allergies: values.allergies ? values.allergies.split(',').map((a) => a.trim()).filter(Boolean) : [],
        medicalNotes: values.medicalNotes ?? null,
        wearsDiapers: false,
        drinksBottle: false,
      })
      toast.success('Child added successfully')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to add child')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Child</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="classroom">Classroom</Label>
              <Input id="classroom" {...register('classroom')} placeholder="e.g. Sunflowers" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="allergies">Allergies (comma-separated)</Label>
            <Input id="allergies" {...register('allergies')} placeholder="e.g. Peanuts, Dairy" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="medicalNotes">Medical Notes (optional)</Label>
            <textarea
              id="medicalNotes"
              {...register('medicalNotes')}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Adding…' : 'Add Child'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
