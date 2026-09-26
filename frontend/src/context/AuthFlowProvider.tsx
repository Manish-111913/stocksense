import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthFlowContext, type RouteModalState } from './authFlow.ts'

export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const [registeredEmail, setRegisteredEmail] = useState('you@company.com')
  const [routeModal, setRouteModal] = useState<RouteModalState | null>(null)

  const showRouteModal = useCallback((route: string, title: string, description: ReactNode, isSuccess = false) => {
    setRouteModal({ route, title, description, isSuccess })
  }, [])

  const closeRouteModal = useCallback(() => setRouteModal(null), [])

  const value = useMemo(
    () => ({ registeredEmail, setRegisteredEmail, routeModal, showRouteModal, closeRouteModal }),
    [registeredEmail, routeModal, showRouteModal, closeRouteModal],
  )

  return <AuthFlowContext value={value}>{children}</AuthFlowContext>
}
