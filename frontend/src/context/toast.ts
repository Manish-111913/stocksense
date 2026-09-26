import { createContext, useContext } from 'react'

export interface ToastContextValue {
  /** Shows the dark success toast (top-right) for ~3.8s */
  showToast: (title: string, subtitle: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within <AppLayout>')
  return context
}
