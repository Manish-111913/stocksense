import type { AuthResponse, UserProfile } from './types.ts'

// Signed-in session: tokens + the user's profile. "Remember me" keeps it in localStorage;
// otherwise it lives in sessionStorage and ends when the browser tab closes.
const STORAGE_KEY = 'stocksense.session'

export interface Session {
  accessToken: string
  refreshToken: string
  user: UserProfile
}

let persistent = true
let session: Session | null = read()
const listeners = new Set<() => void>()

function storages(): Storage[] {
  try {
    return [localStorage, sessionStorage]
  } catch {
    return []
  }
}

function read(): Session | null {
  for (const storage of storages()) {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (raw) {
        persistent = storage === localStorage
        return JSON.parse(raw) as Session
      }
    } catch {
      // Unreadable entry: treat as signed out
    }
  }
  return null
}

function write(next: Session | null) {
  session = next
  for (const storage of storages()) {
    try {
      storage.removeItem(STORAGE_KEY)
      if (next && storage === (persistent ? localStorage : sessionStorage)) {
        storage.setItem(STORAGE_KEY, JSON.stringify(next))
      }
    } catch {
      // Storage unavailable (private mode etc.): the session still lives in memory
    }
  }
  listeners.forEach((listener) => listener())
}

export function getSession(): Session | null {
  return session
}

/** `remember` applies on sign-in; token refreshes keep the current choice */
export function setSessionFromAuth(auth: AuthResponse, remember?: boolean) {
  if (remember !== undefined) persistent = remember
  write({ accessToken: auth.accessToken, refreshToken: auth.refreshToken, user: auth.user })
}

export function updateSessionUser(user: UserProfile) {
  if (session) write({ ...session, user })
}

export function clearSession() {
  write(null)
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
