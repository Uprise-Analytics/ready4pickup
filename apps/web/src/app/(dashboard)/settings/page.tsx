'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@store/auth.store'
import { useThemeStore, ACCENT_OPTIONS } from '@store/theme.store'
import { useUpdateUser } from '@hooks/useAdmin'
import { useSchoolDetail, useUpdateSchool } from '@hooks/useAdmin'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Separator } from '@components/ui/separator'
import { toast } from 'sonner'
import { Settings, Palette, User, Bell, School, Check } from 'lucide-react'
import type { Profile, NotificationPreferences } from '@/types/database'

const TABS = ['Appearance', 'Profile', 'Notifications', 'School'] as const
type Tab = typeof TABS[number]

const NOTIF_LABELS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'on_way',       label: 'On the way',        description: 'When a collector is on the way to school' },
  { key: 'preparing',    label: 'Preparing pickup',  description: 'When a child is being prepared for pickup' },
  { key: 'picked_up',    label: 'Picked up',         description: 'When a child has been picked up' },
  { key: 'announcements',label: 'Announcements',     description: 'School announcements and notices' },
  { key: 'blocked_alert',label: 'Blocked alerts',    description: 'When a collector is blocked' },
]

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuthStore()
  const { accent, setAccent, getAccentOption } = useThemeStore()
  const accentOption = getAccentOption()
  const [tab, setTab] = useState<Tab>('Appearance')

  if (!profile) return null

  const isSchoolAdmin = profile.role === 'school_admin'

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${accentOption.classes.bg} flex items-center justify-center`}>
          <Settings size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">Manage your account and preferences</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Tab sidebar */}
        <nav className="w-44 flex-shrink-0 space-y-1">
          {TABS.filter((t) => t !== 'School' || isSchoolAdmin).map((t) => {
            const icons: Record<Tab, React.ReactNode> = {
              Appearance:    <Palette size={15} />,
              Profile:       <User size={15} />,
              Notifications: <Bell size={15} />,
              School:        <School size={15} />,
            }
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                  tab === t
                    ? `${accentOption.classes.bg} text-white`
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={tab === t ? 'text-white' : 'text-slate-400'}>
                  {icons[t]}
                </span>
                {t}
              </button>
            )
          })}
        </nav>

        {/* Tab content */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-6">
          {tab === 'Appearance' && (
            <AppearanceTab accent={accent} setAccent={setAccent} />
          )}
          {tab === 'Profile' && (
            <ProfileTab profile={profile} onSaved={refreshProfile} />
          )}
          {tab === 'Notifications' && (
            <NotificationsTab profile={profile} onSaved={refreshProfile} />
          )}
          {tab === 'School' && isSchoolAdmin && (
            <SchoolTab schoolId={profile.school_id ?? ''} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Appearance ──────────────────────────────────────────────────────────────

function AppearanceTab({ accent, setAccent }: { accent: string; setAccent: (a: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-1">Appearance</h2>
        <p className="text-sm text-slate-500">Choose an accent colour for the navigation and interactive elements.</p>
      </div>
      <Separator />
      <div>
        <p className="text-sm font-medium text-slate-700 mb-3">Accent colour</p>
        <div className="grid grid-cols-3 gap-3">
          {ACCENT_OPTIONS.map((opt) => {
            const isSelected = accent === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setAccent(opt.value)}
                className={`relative flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  isSelected ? 'border-slate-900 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: opt.hex }}
                />
                <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                {isSelected && (
                  <Check size={14} className="absolute top-2 right-2 text-slate-700" />
                )}
              </button>
            )
          })}
        </div>
      </div>
      <Separator />
      <div>
        <p className="text-sm font-medium text-slate-700 mb-1">Preview</p>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-white p-3 space-y-1">
            {['Dashboard', 'Live Pickups', 'Incidents'].map((item, i) => (
              <div
                key={item}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                  i === 0
                    ? ACCENT_OPTIONS.find((o) => o.value === accent)?.classes.nav
                    : 'text-slate-600'
                }`}
              >
                <div className={`w-3 h-3 rounded-sm ${i === 0 ? ACCENT_OPTIONS.find((o) => o.value === accent)?.classes.bg : 'bg-slate-300'}`} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Profile ─────────────────────────────────────────────────────────────────

function ProfileTab({ profile, onSaved }: { profile: Profile; onSaved: () => Promise<void> }) {
  const [fullName, setFullName] = useState(profile.full_name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const { mutateAsync: updateUser, isPending } = useUpdateUser()

  useEffect(() => {
    setFullName(profile.full_name)
    setPhone(profile.phone ?? '')
  }, [profile])

  async function handleSave() {
    if (!fullName.trim()) { toast.error('Name is required'); return }
    try {
      await updateUser({ userId: profile.id, fullName: fullName.trim(), phone: phone || null })
      await onSaved()
      toast.success('Profile updated')
    } catch { toast.error('Failed to update profile') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-1">Profile</h2>
        <p className="text-sm text-slate-500">Update your personal information.</p>
      </div>
      <Separator />

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="s-name">Full Name</Label>
          <Input id="s-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-email">Email</Label>
          <Input id="s-email" value={profile.email} disabled className="bg-slate-50 text-slate-400" />
          <p className="text-xs text-slate-400">Email address cannot be changed here</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-phone">Phone</Label>
          <Input id="s-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
        </div>
      </div>

      <Separator />
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationsTab({ profile, onSaved }: { profile: Profile; onSaved: () => Promise<void> }) {
  const [prefs, setPrefs] = useState<NotificationPreferences>({ ...profile.notification_prefs })
  const { mutateAsync: updateUser, isPending } = useUpdateUser()

  function toggle(key: keyof NotificationPreferences) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
  }

  async function handleSave() {
    try {
      await updateUser({ userId: profile.id })
      // notification_prefs update — update via direct Supabase call through refreshProfile after save
      const { supabase } = await import('@lib/supabase')
      const { error } = await supabase.from('profiles').update({ notification_prefs: prefs }).eq('id', profile.id)
      if (error) throw error
      await onSaved()
      toast.success('Notification preferences saved')
    } catch { toast.error('Failed to save preferences') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-1">Notifications</h2>
        <p className="text-sm text-slate-500">Choose which push notifications you receive on your mobile device.</p>
      </div>
      <Separator />
      <div className="space-y-4">
        {NOTIF_LABELS.map(({ key, label, description }) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(key)}
              className={`relative flex-shrink-0 w-10 h-6 rounded-full transition-colors ${prefs[key] ? 'bg-blue-600' : 'bg-slate-200'}`}
              style={{ backgroundColor: prefs[key] ? 'var(--accent-hex, #2563EB)' : undefined }}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs[key] ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>
      <Separator />
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}

// ─── School ───────────────────────────────────────────────────────────────────

function SchoolTab({ schoolId }: { schoolId: string }) {
  const { data: school } = useSchoolDetail(schoolId)
  const { mutateAsync: updateSchool, isPending } = useUpdateSchool()

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (school) {
      setName(school.name)
      setAddress(school.address ?? '')
      setPhone(school.phone ?? '')
      setEmail(school.email ?? '')
    }
  }, [school])

  async function handleSave() {
    try {
      await updateSchool({ id: schoolId, name, address: address || undefined, phone: phone || undefined, email: email || undefined })
      toast.success('School details updated')
    } catch { toast.error('Failed to update school') }
  }

  if (!school) return <div className="text-sm text-slate-400">Loading school details…</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-1">School</h2>
        <p className="text-sm text-slate-500">Update your school's contact information.</p>
      </div>
      <Separator />
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="sc-name">School Name</Label>
          <Input id="sc-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-address">Address</Label>
          <Input id="sc-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 School Street" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sc-phone">Phone</Label>
            <Input id="sc-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-email">Email</Label>
            <Input id="sc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@school.com" />
          </div>
        </div>
      </div>
      <Separator />
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
