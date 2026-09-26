import { ApiError } from '../../api/client.ts'
import type { Adjustment, DocumentStatus } from '../../api/types.ts'
import { formatQty } from '../products/productsData.ts'

/** Adjustments only use DRAFT → DONE, or CANCELED */
export type AdjustmentStatus = Extract<DocumentStatus, 'DRAFT' | 'DONE' | 'CANCELED'>

export const STATUS_LABELS: Record<AdjustmentStatus, string> = {
  DRAFT: 'Draft',
  DONE: 'Applied',
  CANCELED: 'Canceled',
}

export function statusLabel(status: DocumentStatus) {
  return STATUS_LABELS[status as AdjustmentStatus] ?? status
}

export interface SelectOption {
  value: string
  label: string
}

export const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: STATUS_LABELS.DRAFT },
  { value: 'DONE', label: STATUS_LABELS.DONE },
  { value: 'CANCELED', label: STATUS_LABELS.CANCELED },
]

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

/** Common reasons offered in the create / edit form ("Other" switches to free text) */
export const REASON_PRESETS = ['Physical Count Correction', 'Cycle Count', 'Damaged Stock', 'Missing / Lost Stock', 'Expired Stock', 'Found Stock', 'Data Entry Error']

export const OTHER_REASON = '__OTHER__'

/** Signed quantity: "+3", "−3", "0" */
export function signedQty(value: number) {
  if (value > 0) return `+${formatQty(value)}`
  if (value < 0) return `−${formatQty(Math.abs(value))}`
  return '0'
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const BADGE_BASE = 'inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-semibold'

/** Difference badge: deficit (rose), surplus (emerald) or zero (slate) */
export function differenceBadgeClass(difference: number) {
  if (difference < 0) return `${BADGE_BASE} bg-rose-50 text-rose-700 border border-rose-200/60`
  if (difference > 0) return `${BADGE_BASE} bg-emerald-50 text-emerald-700 border border-emerald-200/60`
  return `${BADGE_BASE} bg-slate-100 text-slate-700 border border-slate-200`
}

export function differenceTextClass(difference: number) {
  if (difference < 0) return 'text-rose-600'
  if (difference > 0) return 'text-emerald-700'
  return 'text-slate-700'
}

/** Apply failed because stock moved since the draft was recorded (409 STALE_STOCK) */
export function isStaleStockError(err: unknown) {
  return err instanceof ApiError && err.code === 'STALE_STOCK'
}

export function applyToastSubtitle(a: Adjustment) {
  return `${a.reference}: stock of ${a.product.name} at ${a.warehouse.code} / ${a.location.name} set to ${formatQty(a.physicalQuantity)} ${a.product.unitOfMeasure} (${signedQty(a.difference)}).`
}

// KPI summary cards: the selected card is highlighted (indigo ring + top bar)
export const KPI_CARD = 'bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all cursor-pointer'
export const KPI_CARD_ELEVATED = 'bg-white rounded-xl border border-indigo-500 ring-2 ring-indigo-500/20 p-5 shadow-md transition-all cursor-pointer relative overflow-hidden'

/** '' is the "Total" card (clears the status filter) */
export type KpiKey = AdjustmentStatus | ''

export interface KpiCard {
  key: KpiKey
  label: string
  labelClass: string
  badge: string
  badgeClass: string
  unit: string
  caption: string
}

const KPI_LABEL = 'text-[11px] font-semibold uppercase tracking-wider'

export const KPI_CARDS: KpiCard[] = [
  {
    key: 'DRAFT',
    label: 'Draft',
    labelClass: `${KPI_LABEL} text-amber-700`,
    badge: 'To Apply',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60',
    unit: 'drafts',
    caption: 'Counted, stock not changed yet',
  },
  {
    key: 'DONE',
    label: 'Applied',
    labelClass: `${KPI_LABEL} text-emerald-700`,
    badge: 'Posted',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    unit: 'applied',
    caption: 'Stock set to the physical count',
  },
  {
    key: 'CANCELED',
    label: 'Canceled',
    labelClass: `${KPI_LABEL} text-slate-500`,
    badge: 'Voided',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600',
    unit: 'canceled',
    caption: 'No ledger movement',
  },
  {
    key: '',
    label: 'Total',
    labelClass: `${KPI_LABEL} text-indigo-700`,
    badge: 'All',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80',
    unit: 'adjustments',
    caption: 'Every adjustment recorded',
  },
]
