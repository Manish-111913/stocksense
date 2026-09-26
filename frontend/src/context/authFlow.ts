import { createContext, useContext, type ReactNode } from 'react'

export interface RouteModalState {
  route: string
  title: string
  description: ReactNode
  isSuccess: boolean
}

export interface AuthFlowContextValue {
  /** Email the OTP was sent to; shown masked on the Verify OTP screen */
  registeredEmail: string
  setRegisteredEmail: (email: string) => void
  routeModal: RouteModalState | null
  showRouteModal: (route: string, title: string, description: ReactNode, isSuccess?: boolean) => void
  closeRouteModal: () => void
}

export const AuthFlowContext = createContext<AuthFlowContextValue | null>(null)

export function useAuthFlow(): AuthFlowContextValue {
  const context = useContext(AuthFlowContext)
  if (!context) throw new Error('useAuthFlow must be used within <AuthFlowProvider>')
  return context
}
