import { useSyncExternalStore } from 'react'
import { getSession, subscribeSession } from '../api/session.ts'
import { ROLE_LABEL, type UserProfile } from '../api/types.ts'

/** The signed-in user (or null), kept in sync with login / logout / token refresh */
export function useCurrentUser(): UserProfile | null {
  return useSyncExternalStore(subscribeSession, () => getSession()?.user ?? null)
}

/** Display helpers for headers: full name, first-letter avatar and role label */
export function useUserBadge() {
  const user = useCurrentUser()
  return {
    user,
    name: user?.fullName ?? '',
    initial: (user?.fullName.trim()[0] ?? '?').toUpperCase(),
    roleLabel: user ? ROLE_LABEL[user.role] : '',
  }
}
