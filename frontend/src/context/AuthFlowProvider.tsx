import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthFlowContext } from './authFlow.ts'

// Kept in sessionStorage so refreshing Verify OTP / Reset Password doesn't lose the reset flow
const STORAGE_KEY = 'stocksense.resetFlow'

interface StoredFlow {
  email: string
  resetToken: string | null
}

function readStored(): StoredFlow {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredFlow
  } catch {
    // Storage unavailable
  }
  return { email: '', resetToken: null }
}

export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const [registeredEmail, setRegisteredEmail] = useState(() => readStored().email)
  const [resetToken, setResetToken] = useState<string | null>(() => readStored().resetToken)

  useEffect(() => {
    try {
      if (registeredEmail || resetToken) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ email: registeredEmail, resetToken }))
      } else {
        sessionStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Storage unavailable: the flow still works until the page is refreshed
    }
  }, [registeredEmail, resetToken])

  const clearResetFlow = useCallback(() => {
    setRegisteredEmail('')
    setResetToken(null)
  }, [])

  const value = useMemo(
    () => ({ registeredEmail, setRegisteredEmail, resetToken, setResetToken, clearResetFlow }),
    [registeredEmail, resetToken, clearResetFlow],
  )

  return <AuthFlowContext value={value}>{children}</AuthFlowContext>
}
