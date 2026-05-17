﻿'use client'

import { useState } from 'react'
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
import { useReportIncident } from '@hooks/useSchoolAdmin'
import { useAuthStore } from '@store/auth.store'
import type { IncidentSeverity, IncidentCategory } from '@/types/database'

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum(['injury', 'behavioral', 'medical', 'safety', 'property', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  location: z.string().optional(),
  witnesses: z.string().optional(),
  actionTaken: z.string().optional(),
  occurredAt: z.string().min(1, 'Required'),
  followUpRequired: z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  schoolId: string
}

export function ReportIncidentDialog({ open, onOpenChange, schoolId }: Props) {
  const profile = useAuthStore((s) => s.profile)
  const { mutateAsync, isPending } = useReportIncident()

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      severity: 'low',
      category: 'other',
      occurredAt: new Date().toISOString().slice(0, 16),
      followUpRequired: false,
    },
  })

  async function onSubmit(values: FormData) {
    try {
      await mutateAsync({
        schoolId,
        reportedBy: profile!.id,
        title: values.title,
        description: values.description,
        category: values.category as IncidentCategory,
        severity: values.severity as IncidentSeverity,
        childId: null,
        location: values.location ?? null,
        witnesses: values.witnesses ?? null,
        actionTaken: values.actionTaken ?? null,
        followUpRequired: values.followUpRequired ?? false,
        occurredAt: new Date(values.occurredAt).toISOString(),
      })
      toast.success('Incident reported successfully')
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to report incident')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Incident</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} placeholder="Brief title of the incident" />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select defaultValue="other" onValueChange={(v) => setValue('category', v as IncidentCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['injury', 'behavioral', 'medical', 'safety', 'property', 'other'].map((c) => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select defaultValue="low" onValueChange={(v) => setValue('severity', v as IncidentSeverity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="occurredAt">Date & Time</Label>
            <Input id="occurredAt" type="datetime-local" {...register('occurredAt')} />
            {errors.occurredAt && <p className="text-xs text-red-500">{errors.occurredAt.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              {...register('description')}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              placeholder="Describe what happened..."
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Location (optional)</Label>
            <Input id="location" {...register('location')} placeholder="e.g. Playground, Classroom A" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="actionTaken">Action Taken (optional)</Label>
            <Input id="actionTaken" {...register('actionTaken')} placeholder="Immediate actions taken" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Reporting...' : 'Report Incident'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
