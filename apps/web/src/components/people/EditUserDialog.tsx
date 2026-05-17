'use client'

import { useEffect } from 'react'
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
import { useUpdateUser } from '@hooks/useAdmin'
import { useAuthStore } from '@store/auth.store'
import type { Profile, UserRole } from '@/types/database'

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.enum(['platform_owner', 'school_admin', 'teacher', 'parent', 'collector']),
  isActive: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface Props {
  user: Profile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditUserDialog({ user, open, onOpenChange }: Props) {
  const { mutateAsync, isPending } = useUpdateUser()
  const currentRole = useAuthStore((s) => s.profile?.role)

  const isSchoolAdmin = currentRole === 'school_admin'
  const editingParentOrCollector = user?.role === 'parent' || user?.role === 'collector'
  const roleIsLocked = isSchoolAdmin && editingParentOrCollector

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', phone: '', role: 'teacher', isActive: true },
  })

  useEffect(() => {
    if (user) {
      reset({
        fullName: user.full_name,
        phone: user.phone ?? '',
        role: user.role as FormData['role'],
        isActive: user.is_active,
      })
    }
  }, [user, reset])

  async function onSubmit(values: FormData) {
    if (!user) return
    try {
      await mutateAsync({
        userId: user.id,
        fullName: values.fullName,
        phone: values.phone || null,
        role: roleIsLocked ? (user.role as UserRole) : (values.role as UserRole),
        isActive: values.isActive,
      })
      toast.success('User updated')
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user'
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-fullName">Full Name</Label>
            <Input id="edit-fullName" {...register('fullName')} />
            {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={user?.email ?? ''} disabled className="bg-slate-50 text-slate-400" />
            <p className="text-xs text-slate-400">Email cannot be changed here</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input id="edit-phone" type="tel" {...register('phone')} placeholder="+1 234 567 8900" />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            {roleIsLocked ? (
              <div className="space-y-1">
                <div className="h-9 px-3 flex items-center rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-500 capitalize">
                  {user?.role}
                </div>
                <p className="text-xs text-slate-400">
                  Parents and collectors set their own role on registration and cannot be changed here.
                </p>
              </div>
            ) : (
              <Select value={watch('role')} onValueChange={(v) => setValue('role', v as FormData['role'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {!isSchoolAdmin && <SelectItem value="platform_owner">Platform Owner</SelectItem>}
                  <SelectItem value="school_admin">School Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  {!isSchoolAdmin && <SelectItem value="parent">Parent</SelectItem>}
                  {!isSchoolAdmin && <SelectItem value="collector">Collector</SelectItem>}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="edit-isActive"
              checked={watch('isActive')}
              onChange={(e) => setValue('isActive', e.target.checked)}
              className="rounded border-slate-300"
            />
            <Label htmlFor="edit-isActive">Account active</Label>
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
