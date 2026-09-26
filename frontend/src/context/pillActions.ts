import { createContext, useContext, useEffect, useRef } from 'react'

export type PillActionRegistry = Map<string, () => void>

export const PillActionsContext = createContext<PillActionRegistry | null>(null)

// Lets a page handle one of the shell's view-switcher pill buttons (e.g. "+ New Transfer")
export function usePillAction(action: string, handler: () => void) {
  const registry = useContext(PillActionsContext)
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    if (!registry) return
    const run = () => handlerRef.current()
    registry.set(action, run)
    return () => {
      if (registry.get(action) === run) registry.delete(action)
    }
  }, [registry, action])
}
