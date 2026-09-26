import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ROUTES } from '../routes.ts'
import { useCurrentUser } from './useAuth.ts'

/** App screens: signed-out visitors go to Sign In, then come back here */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useCurrentUser()
  const location = useLocation()
  if (!user) {
    return <Navigate replace state={{ from: location.pathname + location.search }} to={ROUTES.login} />
  }
  return children
}

/**
 * Auth screens: a signed-in user is sent on, so a successful login/signup redirects automatically
 * (back to the page that required sign-in, or the Dashboard)
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const user = useCurrentUser()
  const location = useLocation()
  if (user) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate replace to={from ?? ROUTES.dashboard} />
  }
  return children
}
