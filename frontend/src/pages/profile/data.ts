import { ROUTES } from '../../routes.ts'

export type NavTab = {
  label: string
  to: string
  badge?: string
}

// Sub-navigation tabs before the active "Profile & Account" tab
export const NAV_TABS: NavTab[] = [
  { label: 'Dashboard', to: ROUTES.dashboard },
  { label: 'Products', to: ROUTES.products },
  { label: 'Receipts', to: ROUTES.receipts, badge: '12' },
  { label: 'Deliveries', to: ROUTES.deliveries, badge: '8' },
  { label: 'Transfers', to: ROUTES.transfers, badge: '24' },
  { label: 'Adjustments', to: ROUTES.adjustments, badge: '18' },
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
export const LOGOUT_PATH = 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'

export const ACTIVE_FILTER_PILLS: string[] = ['Status: Verified Active', 'Role: Inventory Admin', 'Node: Bhiwandi Gateway']

export type SessionAttribute = {
  title: string
  value: string
  status: string
  statusClassName: string
  dotClassName: string
  iconBoxClassName: string
  iconPath: string
  badge: string
  badgeClassName: string
  rowClassName: string
}

const ATTR_ROW_DIVIDED = 'flex items-center justify-between pb-2.5 border-b border-slate-200/70'

export const SESSION_ATTRIBUTES: SessionAttribute[] = [
  {
    title: 'Client Environment',
    value: 'macOS Chrome 128.0',
    status: 'Active · Secure TLS',
    statusClassName: 'text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1',
    dotClassName: 'w-1.5 h-1.5 rounded-full bg-emerald-500',
    iconBoxClassName: 'w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-brand-600 shrink-0 mt-0.5 shadow-sm',
    iconPath: MONITOR_PATH,
    badge: 'AES-256',
    badgeClassName: 'px-2 py-0.5 rounded bg-brand-100 text-brand-800 font-mono font-semibold text-xs shrink-0',
    rowClassName: ATTR_ROW_DIVIDED,
  },
  {
    title: 'IP Address & Gateway',
    value: '103.21.144.92 (Bhiwandi)',
    status: 'Verified Node',
    statusClassName: 'text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1',
    dotClassName: 'w-1.5 h-1.5 rounded-full bg-emerald-500',
    iconBoxClassName: 'w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 mt-0.5 shadow-sm',
    iconPath: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    badge: 'Static IP',
    badgeClassName: 'px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-semibold text-xs shrink-0',
    rowClassName: ATTR_ROW_DIVIDED,
  },
  {
    title: 'Authentication Authority',
    value: 'Enterprise SSO & Token',
    status: 'Hardware Key Bound',
    statusClassName: 'text-[10px] text-brand-700 font-medium mt-0.5 flex items-center gap-1',
    dotClassName: 'w-1.5 h-1.5 rounded-full bg-brand-600',
    iconBoxClassName: 'w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-700 shrink-0 mt-0.5 shadow-sm',
    iconPath: LOCK_PATH,
    badge: 'SSO-OK',
    badgeClassName: 'px-2 py-0.5 rounded bg-indigo-100 text-brand-800 font-mono font-semibold text-xs shrink-0',
    rowClassName: 'flex items-center justify-between',
  },
]

export type ToastState = {
  visible: boolean
  title: string
  message: string
  isError: boolean
}

export const INITIAL_TOAST: ToastState = {
  visible: false,
  title: 'Success',
  message: 'Action performed successfully.',
  isError: false,
}
