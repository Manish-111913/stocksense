import { ROUTES } from '../../routes.ts'

export type NavTab = {
  label: string
  to: string
}

// Sub-navigation tabs before the active "Profile & Account" tab
export const NAV_TABS: NavTab[] = [
  { label: 'Dashboard', to: ROUTES.dashboard },
  { label: 'Products', to: ROUTES.products },
  { label: 'Receipts', to: ROUTES.receipts },
  { label: 'Deliveries', to: ROUTES.deliveries },
  { label: 'Transfers', to: ROUTES.transfers },
  { label: 'Adjustments', to: ROUTES.adjustments },
  { label: 'Move History', to: ROUTES.moveHistory },
  { label: 'Warehouse', to: ROUTES.warehouse },
]

export type DockItem = {
  title: string
  to: string
  path: string
}

const TRANSFER_ARROWS = 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'

// Floating dock items before the active Profile item
export const DOCK_ITEMS: DockItem[] = [
  { title: 'Dashboard', to: ROUTES.dashboard, path: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { title: 'Products', to: ROUTES.products, path: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { title: 'Receipts', to: ROUTES.receipts, path: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { title: 'Deliveries', to: ROUTES.deliveries, path: TRANSFER_ARROWS },
  { title: 'Transfers', to: ROUTES.transfers, path: TRANSFER_ARROWS },
  { title: 'Adjustments', to: ROUTES.adjustments, path: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
  { title: 'Move History', to: ROUTES.moveHistory, path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
]

// Shared SVG paths
export const USER_PATH = 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
export const LOCK_PATH = 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
export const SHIELD_CHECK_PATH = 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
export const PENCIL_PATH = 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
export const CHEVRON_DOWN_PATH = 'M19 9l-7 7-7-7'
export const SEARCH_PATH = 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
export const MONITOR_PATH = 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
export const CHECK_PATH = 'M5 13l4 4L19 7'
export const CLOCK_PATH = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
export const LOGOUT_PATH = 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'

export type ToastState = {
  visible: boolean
  title: string
  message: string
  isError: boolean
}

export const INITIAL_TOAST: ToastState = {
  visible: false,
  title: '',
  message: '',
  isError: false,
}

// Mirrors the backend rules (users.dto.ts / auth.dto.ts) and the Sign Up page
export const NAME_MIN_LENGTH = 2
export const NAME_MAX_LENGTH = 150
export const PHONE_MAX_LENGTH = 30
export const PHONE_PATTERN = /^[0-9+()\-\s]*$/
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

/** "Jane Doe" -> "JD", "jane" -> "J" */
export function initialsOf(fullName: string | undefined) {
  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return `${first}${last}`.toUpperCase()
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** How long the account has existed, e.g. "8 months", "12 days", "today" */
export function tenureOf(iso: string | null | undefined) {
  if (!iso) return ''
  const created = new Date(iso)
  if (Number.isNaN(created.getTime())) return ''
  const now = new Date()
  const days = Math.floor((now.getTime() - created.getTime()) / 86_400_000)
  if (days < 1) return 'joined today'
  if (days < 31) return `${days} ${days === 1 ? 'day' : 'days'}`
  const months = (now.getFullYear() - created.getFullYear()) * 12 + now.getMonth() - created.getMonth() - (now.getDate() < created.getDate() ? 1 : 0)
  if (months < 12) return `${Math.max(months, 1)} ${months <= 1 ? 'month' : 'months'}`
  const years = Math.floor(months / 12)
  return `${years} ${years === 1 ? 'year' : 'years'}`
}

/** Short browser / OS summary of this device from the user agent, e.g. "Chrome on Windows" */
export function describeThisDevice() {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  let browser = 'Browser'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Safari\//.test(ua)) browser = 'Safari'
  let os = ''
  if (/Windows/.test(ua)) os = 'Windows'
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS'
  else if (/CrOS/.test(ua)) os = 'ChromeOS'
  else if (/Linux/.test(ua)) os = 'Linux'
  return { browser, os, label: os ? `${browser} on ${os}` : browser }
}
