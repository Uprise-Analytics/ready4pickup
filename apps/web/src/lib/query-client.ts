import { QueryClient } from '@tanstack/react-query'

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('Network request failed') ||
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout')
    )
  }
  return false
}

function isClientError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status
    return status >= 400 && status < 500
  }
  return false
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        if (isClientError(error)) return false
        if (failureCount >= 2) return false
        return isNetworkError(error)
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error) => {
        if (failureCount >= 1) return false
        return isNetworkError(error)
      },
      retryDelay: 1500,
    },
  },
})

export const queryKeys = {
  schools: {
    all: ['schools'] as const,
    detail: (id: string) => ['schools', id] as const,
  },
  profiles: {
    me: ['profiles', 'me'] as const,
    detail: (id: string) => ['profiles', id] as const,
    school: (schoolId: string) => ['profiles', 'school', schoolId] as const,
  },
  children: {
    all: ['children'] as const,
    mine: (parentId: string) => ['children', 'mine', parentId] as const,
    school: (schoolId: string) => ['children', 'school', schoolId] as const,
    detail: (id: string) => ['children', id] as const,
  },
  checkins: {
    today: (schoolId: string) => ['checkins', 'today', schoolId] as const,
    child: (childId: string) => ['checkins', 'child', childId] as const,
  },
  pickups: {
    active: (schoolId: string) => ['pickups', 'active', schoolId] as const,
    history: (params: object) => ['pickups', 'history', params] as const,
    detail: (id: string) => ['pickups', id] as const,
    myActive: (userId: string) => ['pickups', 'my-active', userId] as const,
  },
  collectors: {
    forChild: (childId: string) => ['collectors', 'child', childId] as const,
    myChildren: (collectorId: string) => ['collectors', 'my-children', collectorId] as const,
  },
  notifications: {
    mine: (userId: string) => ['notifications', userId] as const,
    unreadCount: (userId: string) => ['notifications', 'unread', userId] as const,
  },
  announcements: {
    school: (schoolId: string) => ['announcements', schoolId] as const,
  },
  notes: {
    child: (childId: string) => ['notes', 'child', childId] as const,
  },
  reportCards: {
    child: (childId: string) => ['report-cards', 'child', childId] as const,
  },
  admin: {
    stats: ['admin', 'stats'] as const,
    users: (filters?: object) => ['admin', 'users', filters ?? {}] as const,
  },
  consumables: {
    types: (classroomId: string) => ['consumables', 'types', classroomId] as const,
    childStock: (childId: string) => ['consumables', 'stock', childId] as const,
  },
  inventory: {
    school: (schoolId: string) => ['inventory', 'school', schoolId] as const,
    classroom: (classroomId: string) => ['inventory', 'classroom', classroomId] as const,
    stockTakes: (key: string) => ['inventory', 'stock-takes', key] as const,
    events: (key: string) => ['inventory', 'events', key] as const,
  },
  teacher: {
    classroomIds: ['teacher', 'classroom-ids'] as const,
    roster: (schoolId: string) => ['teacher', 'roster', schoolId] as const,
    checkins: (date: string) => ['teacher', 'checkins', date] as const,
  },
}
