import type { LedgerDirection, LedgerEntry, MovementType } from '../../api/types.ts'
import { formatQty } from '../products/productsData.ts'
import { receiptPath, ROUTES } from '../../routes.ts'

export interface NavLink {
  label: string
  to?: string
  active?: boolean
}

// Pinned sub-navigation tab bar (Directory has no module, keeps the original no-op)
export const NAV_LINKS: NavLink[] = [
  { label: 'Dashboard', to: ROUTES.dashboard },
  { label: 'Products', to: ROUTES.products },
  { label: 'Receipts', to: ROUTES.receipts },
  { label: 'Deliveries', to: ROUTES.deliveries },
  { label: 'Transfers', to: ROUTES.transfers },
  { label: 'Adjustments', to: ROUTES.adjustments },
  { label: 'Move History', to: ROUTES.moveHistory, active: true },
  { label: 'Warehouse', to: ROUTES.warehouse },
  { label: 'Directory' },
]

export interface DockItem {
  title: string
  icon: string
  to: string
  active?: boolean
}

export const DOCK_ITEMS: DockItem[] = [
  { title: 'Dashboard', icon: 'dashboard', to: ROUTES.dashboard },
  { title: 'Products', icon: 'inventory_2', to: ROUTES.products },
  { title: 'Receipts', icon: 'move_to_inbox', to: ROUTES.receipts },
  { title: 'Deliveries', icon: 'local_shipping', to: ROUTES.deliveries },
  { title: 'Transfers', icon: 'sync_alt', to: ROUTES.transfers },
  { title: 'Adjustments', icon: 'tune', to: ROUTES.adjustments },
  { title: 'Move History', icon: 'history', to: ROUTES.moveHistory, active: true },
  { title: 'Warehouse', icon: 'warehouse', to: ROUTES.warehouse },
]

export const MOVEMENT_TYPES: MovementType[] = ['RECEIPT', 'DELIVERY', 'INTERNAL_TRANSFER', 'ADJUSTMENT']

export const MOVEMENT_BADGES: Record<MovementType, { className: string; icon: string; label: string }> = {
  INTERNAL_TRANSFER: {
    className: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100',
    icon: 'sync_alt',
    label: 'Internal Transfer',
  },
  RECEIPT: {
    className: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-100',
    icon: 'move_to_inbox',
    label: 'Receipt',
  },
  DELIVERY: {
    className: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 font-semibold text-[11px] border border-rose-100',
    icon: 'local_shipping',
    label: 'Delivery',
  },
  ADJUSTMENT: {
    className: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-semibold text-[11px] border border-amber-200',
    icon: 'tune',
    label: 'Inventory Adjustment',
  },
}

export const DIRECTION_LABEL: Record<LedgerDirection, string> = {
  IN: 'Stock In',
  OUT: 'Stock Out',
  TRANSFER: 'Transfer',
  ADJUSTMENT_IN: 'Adjustment +',
  ADJUSTMENT_OUT: 'Adjustment −',
}

export interface SelectOption {
  value: string
  label: string
}

export const MOVEMENT_OPTIONS: SelectOption[] = [{ value: '', label: 'All Movements' }, ...MOVEMENT_TYPES.map((type) => ({ value: type, label: MOVEMENT_BADGES[type].label }))]

export type DatePreset = '' | 'TODAY' | '7D' | '30D'

export const DATE_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Time' },
  { value: 'TODAY', label: 'Today' },
  { value: '7D', label: 'Last 7 Days' },
  { value: '30D', label: 'Last 30 Days' },
]

/** Local calendar day as YYYY-MM-DD */
function isoDay(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** dateFrom / dateTo filters for a date preset (both undefined for "All Time") */
export function dateRangeFor(preset: DatePreset): { dateFrom?: string; dateTo?: string } {
  if (!preset) return {}
  const today = new Date()
  const from = new Date(today)
  if (preset === '7D') from.setDate(from.getDate() - 6)
  if (preset === '30D') from.setDate(from.getDate() - 29)
  return { dateFrom: isoDay(from), dateTo: isoDay(today) }
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** "+500 KG" / "−10 PCS" */
export function signedQty(entry: LedgerEntry) {
  const sign = entry.signedQuantity < 0 ? '−' : '+'
  return `${sign}${formatQty(entry.quantity)} ${entry.product.unitOfMeasure}`
}

/** "100 → 97 KG" (location balance), or null when the backend didn't record it */
export function balanceChange(entry: LedgerEntry) {
  if (entry.quantityBefore === null || entry.quantityAfter === null) return null
  return `${formatQty(entry.quantityBefore)} → ${formatQty(entry.quantityAfter)} ${entry.product.unitOfMeasure}`
}

export const isOutgoing = (entry: LedgerEntry) => entry.signedQuantity < 0

/** Where the source document lives: receipts have a detail page, the others their list */
export function documentPath(reference: LedgerEntry['reference']) {
  switch (reference.type) {
    case 'RECEIPT':
      return receiptPath(reference.id)
    case 'DELIVERY':
      return ROUTES.deliveries
    case 'INTERNAL_TRANSFER':
      return ROUTES.transfers
    case 'ADJUSTMENT':
      return ROUTES.adjustments
  }
}

/** Short, human label for the ledger entry id */
export const entryLabel = (entry: LedgerEntry) => `#${entry.id.slice(0, 8).toUpperCase()}`

/** Page numbers with gaps, e.g. [1, 'gap', 4, 5, 6, 'gap', 20] */
export function pageList(current: number, total: number): (number | 'gap')[] {
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total))
  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('gap')
    result.push(p)
  })
  return result
}
