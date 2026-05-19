'use client'

import { useState, useEffect } from 'react'
import { useUpdateSchool } from '@hooks/useAdmin'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@components/ui/dialog'
import { toast } from 'sonner'
import type { School } from '@/types/database'

interface Props {
  school: School | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditSchoolDialog({ school, open, onOpenChange }: Props) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const { mutateAsync: updateSchool, isPending } = useUpdateSchool()

  useEffect(() => {
    if (school) {
      setName(school.name)
      setAddress(school.address ?? '')
      setPhone(school.phone ?? '')
      setEmail(school.email ?? '')
    }
  }, [school])

  async function handleSave() {
    if (!school) return
    if (!name.trim()) { toast.error('School name is required'); return }
    try {
      await updateSchool({
        id: school.id,
        name: name.trim(),
        address: address || undefined,
        phone: phone || undefined,
        email: email || undefined,
      })
      toast.success('School updated')
      onOpenChange(false)
    } catch {
      toast.error('Failed to update school')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit School</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="es-name">School Name</Label>
            <Input id="es-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="es-address">Address</Label>
            <Input id="es-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 School Street" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="es-phone">Phone</Label>
              <Input id="es-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="es-email">Email</Label>
              <Input id="es-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@school.com" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
