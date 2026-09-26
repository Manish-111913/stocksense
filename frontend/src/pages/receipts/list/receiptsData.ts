import { DOCUMENT_STATUS_LABEL, type DocumentStatus, type Receipt } from '../../../api/types.ts'
import { formatQty } from '../../products/productsData.ts'

export const RECEIPT_STATUSES = Object.keys(DOCUMENT_STATUS_LABEL) as DocumentStatus[]

export interface SelectOption {
  value: string
  label: string
}

export const STATUS_OPTIONS: SelectOption[] = [{ value: '', label: 'All Statuses' }, ...RECEIPT_STATUSES.map((status) => ({ value: status, label: DOCUMENT_STATUS_LABEL[status] }))]

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

/** Receipt dates are stored as UTC midnight: format them in UTC so the day doesn't shift */
export function formatReceiptDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Unit shared by every line, or null when the receipt mixes units */
export function receiptUnit(receipt: Receipt): string | null {
  const units = new Set(receipt.items.map((item) => item.unitOfMeasure))
  return units.size === 1 ? [...units][0] : null
}

export function receiptQuantityLabel(receipt: Receipt) {
  const unit = receiptUnit(receipt)
  return `${formatQty(receipt.totalQuantity)} ${unit ?? (receipt.items.length > 0 ? 'units' : '')}`.trim()
}

/** First product on the receipt, plus how many more */
export function receiptProductsNote(receipt: Receipt) {
  const [first, ...rest] = receipt.items
  if (!first) return 'No lines'
  return rest.length > 0 ? `${first.productName} +${rest.length} more` : first.productName
}

export const linesLabel = (count: number) => `${count} ${count === 1 ? 'line' : 'lines'}`

export interface RowTone {
  rowClass: string
  refLinkClass: string
  refIconClass: string
  refIcon: string
  supplierClass: string
  destinationClass: string
  itemsClass: string
  quantityClass: string
  dateClass: string
}

const ROW_BASE = {
  rowClass: 'hover:bg-slate-50/80 transition-colors group cursor-pointer',
  supplierClass: 'font-semibold text-slate-900 flex items-center gap-1.5',
  destinationClass: 'font-semibold text-slate-800 flex items-center gap-1.5',
  itemsClass: 'px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-medium text-slate-700 border border-slate-200/60',
  quantityClass: 'font-mono font-bold text-slate-900 text-xs',
  dateClass: 'font-mono text-slate-700 text-[11px]',
}

const REF_LINK_PLAIN = 'inline-flex items-center gap-2 font-mono font-bold text-slate-800 hover:text-indigo-600 transition-colors'

export const ROW_TONES: Record<DocumentStatus, RowTone> = {
  READY: {
    ...ROW_BASE,
    refLinkClass: 'inline-flex items-center gap-2 font-mono font-bold text-indigo-600 hover:text-indigo-800 transition-colors',
    refIconClass: 'w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center',
    refIcon: 'description',
  },
  DRAFT: {
    ...ROW_BASE,
    refLinkClass: REF_LINK_PLAIN,
    refIconClass: 'w-6 h-6 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center',
    refIcon: 'edit_note',
  },
  DONE: {
    ...ROW_BASE,
    refLinkClass: REF_LINK_PLAIN,
    refIconClass: 'w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center',
    refIcon: 'call_received',
  },
  WAITING: {
    ...ROW_BASE,
    refLinkClass: REF_LINK_PLAIN,
    refIconClass: 'w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center',
    refIcon: 'local_shipping',
  },
  CANCELED: {
    rowClass: 'hover:bg-slate-50/80 transition-colors group opacity-75 cursor-pointer',
    refLinkClass: 'inline-flex items-center gap-2 font-mono font-bold text-slate-500 line-through hover:text-slate-800 transition-colors',
    refIconClass: 'w-6 h-6 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center',
    refIcon: 'cancel',
    supplierClass: 'font-semibold text-slate-700 flex items-center gap-1.5',
    destinationClass: 'font-semibold text-slate-700 flex items-center gap-1.5',
    itemsClass: 'px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-medium text-slate-500 border border-slate-200/60',
    quantityClass: 'font-mono font-bold text-slate-400 text-xs',
    dateClass: 'font-mono text-slate-500 text-[11px]',
  },
}

// KPI summary cards: the selected card swaps the outer class; each card's inner styling is fixed
export const KPI_CARD_ACTIVE = 'status-kpi-card bg-indigo-50/40 rounded-xl border-2 border-indigo-500/70 p-4 shadow-xs transition-all cursor-pointer relative'
export const KPI_CARD_INACTIVE = 'status-kpi-card bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group'

export interface KpiCard {
  status: DocumentStatus
  headClass: string
  labelClass: string
  iconClass: string
  icon: string
  countClass: string
  unit: string
  unitClass: string
  footClass: string
  captionClass: string
  caption: string
  badgeClass: string
  badge: string
}

const KPI_PLAIN = {
  headClass: 'flex items-center justify-between text-slate-500',
  labelClass: 'text-[11px] font-semibold uppercase tracking-wider text-slate-500',
  countClass: 'text-2xl font-bold font-mono text-slate-900',
  unitClass: 'text-[11px] text-slate-400 font-mono',
  footClass: 'mt-2 text-xs text-slate-500 flex items-center justify-between',
  captionClass: 'truncate',
}

export const KPI_CARDS: KpiCard[] = [
  {
    ...KPI_PLAIN,
    status: 'DRAFT',
    iconClass: 'w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center',
    icon: 'edit_note',
    unit: 'drafts',
    caption: 'Not yet confirmed',
    badgeClass: 'text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 flex-shrink-0',
    badge: 'Editable',
  },
  {
    ...KPI_PLAIN,
    status: 'WAITING',
    iconClass: 'w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center',
    icon: 'local_shipping',
    unit: 'awaiting goods',
    caption: 'Confirmed receipts',
    badgeClass: 'text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60 flex-shrink-0',
    badge: 'Inbound',
  },
  {
    status: 'READY',
    headClass: 'flex items-center justify-between text-indigo-700',
    labelClass: 'text-[11px] font-bold uppercase tracking-wider text-indigo-900',
    iconClass: 'w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center',
    icon: 'verified',
    countClass: 'text-2xl font-bold font-mono text-indigo-950',
    unit: 'to validate',
    unitClass: 'text-[11px] text-indigo-600 font-mono font-medium',
    footClass: 'mt-2 text-xs text-indigo-700 flex items-center justify-between',
    captionClass: 'truncate font-medium',
    caption: 'Goods staged for posting',
    badgeClass: 'text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shadow-xs flex-shrink-0',
    badge: 'Validate Now',
  },
  {
    ...KPI_PLAIN,
    status: 'DONE',
    iconClass: 'w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center',
    icon: 'check_circle',
    unit: 'validated',
    caption: 'Stock ledger updated',
    badgeClass: 'text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex-shrink-0',
    badge: 'Posted',
  },
  {
    ...KPI_PLAIN,
    status: 'CANCELED',
    iconClass: 'w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center',
    icon: 'cancel',
    unit: 'canceled',
    caption: 'No ledger movement',
    badgeClass: 'text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 flex-shrink-0',
    badge: 'Voided',
  },
]
