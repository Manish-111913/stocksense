import { clearSession, getSession, setSessionFromAuth } from './session.ts'
import type { AuthResponse } from './types.ts'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number
  /** Machine-readable error from the backend, e.g. INSUFFICIENT_STOCK or STALE_STOCK */
  readonly code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type QueryValue = string | number | undefined | null
type Query = Record<string, QueryValue>

interface RequestOptions {
  body?: unknown
  query?: Query
  /** Public endpoints (login, signup, …) never send or refresh tokens */
  auth?: boolean
}

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`
}

/** NestJS errors carry `message` as a string or a list of validation messages */
async function toApiError(res: Response): Promise<ApiError> {
  let message = `Request failed (${res.status})`
  let code: string | undefined
  try {
    const body = (await res.json()) as { message?: string | string[]; error?: string }
    if (body.error && /^[A-Z][A-Z_]+$/.test(body.error)) code = body.error
    if (Array.isArray(body.message)) message = body.message[0] ?? message
    else if (body.message) message = body.message
  } catch {
    // Non-JSON error body
  }
  if (res.status === 0 || res.status >= 500) message = 'Something went wrong on our side. Please try again.'
  return new ApiError(res.status, message, code)
}

// One refresh at a time, shared by all requests that hit a 401 together
let refreshing: Promise<boolean> | null = null

function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const current = getSession()
    if (!current) return false
    try {
      const res = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      })
      if (!res.ok) return false
      setSessionFromAuth((await res.json()) as AuthResponse)
      return true
    } catch {
      return false
    }
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

async function send(method: string, path: string, options: RequestOptions, retried = false): Promise<Response> {
  const useAuth = options.auth !== false
  const token = useAuth ? getSession()?.accessToken : undefined

  let res: Response
  try {
    res = await fetch(buildUrl(path, options.query), {
      method,
      headers: {
        ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Unable to reach the StockSense server. Check your connection and try again.')
  }

  if (res.status === 401 && useAuth && !retried) {
    if (await refreshSession()) return send(method, path, options, true)
    // Session is gone: RequireAuth sends the user back to Sign In
    clearSession()
  }
  if (!res.ok) throw await toApiError(res)
  return res
}

export async function api<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const res = await send(method, path, options)
  return (await res.json()) as T
}

/** Downloads a file response (e.g. CSV export) using the signed-in session */
export async function downloadFile(path: string, query: Query, fallbackName: string) {
  const res = await send('GET', path, { query })
  const disposition = res.headers.get('content-disposition') ?? ''
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName
  const url = URL.createObjectURL(await res.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
