import { createContext, useContext } from 'react'

export interface AuthFlowContextValue {
  /** Email the OTP was sent to; shown masked on the Verify OTP screen */
  registeredEmail: string
  setRegisteredEmail: (email: string) => void
  /** Short-lived token from a verified OTP, needed to set the new password */
  resetToken: string | null
  setResetToken: (token: string | null) => void
  /** Forgets the email and reset token once the password reset is finished */
  clearResetFlow: () => void
}

export const AuthFlowContext = createContext<AuthFlowContextValue | null>(null)

export function useAuthFlow(): AuthFlowContextValue {
  const context = useContext(AuthFlowContext)
  if (!context) throw new Error('useAuthFlow must be used within <AuthFlowProvider>')
  return context
}
