import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type AccentColor = 'blue' | 'purple' | 'green' | 'teal' | 'rose' | 'orange'

export const ACCENT_OPTIONS: {
  value: AccentColor
  label: string
  hex: string
  classes: { nav: string; icon: string; border: string; bg: string; text: string; button: string }
}[] = [
  {
    value: 'blue',
    label: 'Ocean Blue',
    hex: '#2563EB',
    classes: {
      nav:    'bg-blue-50 text-blue-700 border-l-2 border-blue-600 pl-2.5',
      icon:   'text-blue-600',
      border: 'border-blue-600',
      bg:     'bg-blue-600',
      text:   'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
  },
  {
    value: 'purple',
    label: 'Royal Purple',
    hex: '#7C3AED',
    classes: {
      nav:    'bg-purple-50 text-purple-700 border-l-2 border-purple-600 pl-2.5',
      icon:   'text-purple-600',
      border: 'border-purple-600',
      bg:     'bg-purple-600',
      text:   'text-purple-700',
      button: 'bg-purple-600 hover:bg-purple-700',
    },
  },
  {
    value: 'green',
    label: 'Forest Green',
    hex: '#16A34A',
    classes: {
      nav:    'bg-green-50 text-green-700 border-l-2 border-green-600 pl-2.5',
      icon:   'text-green-600',
      border: 'border-green-600',
      bg:     'bg-green-600',
      text:   'text-green-700',
      button: 'bg-green-600 hover:bg-green-700',
    },
  },
  {
    value: 'teal',
    label: 'Deep Teal',
    hex: '#0D9488',
    classes: {
      nav:    'bg-teal-50 text-teal-700 border-l-2 border-teal-600 pl-2.5',
      icon:   'text-teal-600',
      border: 'border-teal-600',
      bg:     'bg-teal-600',
      text:   'text-teal-700',
      button: 'bg-teal-600 hover:bg-teal-700',
    },
  },
  {
    value: 'rose',
    label: 'Rose',
    hex: '#E11D48',
    classes: {
      nav:    'bg-rose-50 text-rose-700 border-l-2 border-rose-600 pl-2.5',
      icon:   'text-rose-600',
      border: 'border-rose-600',
      bg:     'bg-rose-600',
      text:   'text-rose-700',
      button: 'bg-rose-600 hover:bg-rose-700',
    },
  },
  {
    value: 'orange',
    label: 'Sunset Orange',
    hex: '#EA580C',
    classes: {
      nav:    'bg-orange-50 text-orange-700 border-l-2 border-orange-600 pl-2.5',
      icon:   'text-orange-600',
      border: 'border-orange-600',
      bg:     'bg-orange-600',
      text:   'text-orange-700',
      button: 'bg-orange-600 hover:bg-orange-700',
    },
  },
]

interface ThemeState {
  accent: AccentColor
  setAccent: (accent: AccentColor) => void
  getAccentOption: () => typeof ACCENT_OPTIONS[0]
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      accent: 'blue',
      setAccent: (accent) => set({ accent }),
      getAccentOption: () => ACCENT_OPTIONS.find((o) => o.value === get().accent) ?? ACCENT_OPTIONS[0],
    }),
    {
      name: 'ready4pickup-theme',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
