import { DOCUMENT_STATUS_LABEL, type DocumentStatus, type Transfer, type TransferStockChange } from '../../api/types.ts'
import { formatQty } from '../products/productsData.ts'

export const TRANSFER_STATUSES = Object.keys(DOCUMENT_STATUS_LABEL) as DocumentStatus[]

export interface SelectOption {
  value: string
  label: string
}

export const STATUS_OPTIONS: SelectOption[] = [{ value: '', label: 'All Statuses' }, ...TRANSFER_STATUSES.map((status) => ({ value: status, label: DOCUMENT_STATUS_LABEL[status] }))]

export type DatePreset = '' | 'TODAY' | '7D' | '30D'

export const DATE_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Time' },
  { value: 'TODAY', label: 'Today' },
  { value: '7D', label: 'Last 7 Days' },
  { value: '30D', label: 'Last 30 Days' },
]

/** Local calendar day as YYYY-MM-DD */
export function isoDay(date: Date) {
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

/** Transfer dates are stored as UTC midnight: format them in UTC so the day doesn't shift */
export function formatTransferDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Transfer date as YYYY-MM-DD for the date input */
export function transferDateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10)
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const linesLabel = (count: number) => `${count} ${count === 1 ? 'line' : 'lines'}`

/** "150 KG" when every line shares a unit, otherwise "150 units" */
export function transferQuantityLabel(transfer: Transfer) {
  const units = new Set(transfer.items.map((item) => item.unitOfMeasure))
  const unit = units.size === 1 ? [...units][0] : transfer.items.length > 0 ? 'units' : ''
  return `${formatQty(transfer.totalQuantity)} ${unit}`.trim()
}

/** First product on the transfer, plus how many more */
export function transferProductsNote(transfer: Transfer) {
  const [first, ...rest] = transfer.items
  if (!first) return 'No lines'
  return rest.length > 0 ? `${first.productName} +${rest.length} more` : first.productName
}

/** Lines the source location can't cover right now */
export const shortLineCount = (transfer: Transfer) => transfer.items.filter((item) => item.shortage > 0).length

/** Stock only matters for transfers that haven't moved (or been voided) yet */
export const isOpenStatus = (status: DocumentStatus) => status === 'DRAFT' || status === 'WAITING' || status === 'READY'

/** "SKU: src 10 → 5, dst 0 → 5 PCS" for the first lines, then "+N more" */
export function stockChangeSummary(changes: TransferStockChange[]) {
  const shown = changes
    .slice(0, 2)
    .map((c) => `${c.sku}: source ${formatQty(c.source.before)} → ${formatQty(c.source.after)}, destination ${formatQty(c.destination.before)} → ${formatQty(c.destination.after)} ${c.unitOfMeasure}`)
  if (changes.length > 2) shown.push(`+${changes.length - 2} more`)
  return shown.join('; ')
}

export interface RowTone {
  refIcon: string
  refIconClass: string
  refTextClass: string
  destinationIconClass: string
}

const TONE_MUTED: RowTone = {
  refIcon: 'swap_horiz',
  refIconClass: 'material-symbols-outlined text-[16px] text-slate-400',
  refTextClass: 'font-bold text-slate-800 group-hover:underline',
  destinationIconClass: 'material-symbols-outlined text-[16px] text-slate-400 mt-0.5',
}

export const ROW_TONES: Record<DocumentStatus, RowTone> = {
  DRAFT: { ...TONE_MUTED, refIcon: 'edit_note' },
  WAITING: {
    refIcon: 'hourglass_top',
    refIconClass: 'material-symbols-outlined text-[16px] text-amber-600',
    refTextClass: 'font-bold text-slate-800 group-hover:underline',
    destinationIconClass: 'material-symbols-outlined text-[16px] text-slate-400 mt-0.5',
  },
  READY: {
    refIcon: 'swap_horiz',
    refIconClass: 'material-symbols-outlined text-[16px] text-indigo-600',
    refTextClass: 'font-bold text-indigo-600 group-hover:underline',
    destinationIconClass: 'material-symbols-outlined text-[16px] text-indigo-600 mt-0.5',
  },
  DONE: {
    refIcon: 'done_all',
    refIconClass: 'material-symbols-outlined text-[16px] text-emerald-600',
    refTextClass: 'font-bold text-slate-800 group-hover:underline',
    destinationIconClass: 'material-symbols-outlined text-[16px] text-slate-400 mt-0.5',
  },
  CANCELED: { ...TONE_MUTED, refIcon: 'block' },
}

// KPI summary cards (counts come from GET /transfers/summary)
export const KPI_CARD_ACTIVE = 'bg-white rounded-xl border border-indigo-500 ring-2 ring-indigo-500/20 p-5 shadow-md transition-all cursor-pointer relative overflow-hidden'
export const KPI_CARD_INACTIVE = 'bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all cursor-pointer'

export interface KpiCard {
  status: DocumentStatus
  labelClass: string
  badge: string
  badgeClass: string
  countClass: string
  unit: string
  caption: string
  captionClass: string
}

const KPI_PLAIN = {
  countClass: 'text-2xl font-bold font-mono text-slate-900',
  captionClass: 'mt-2 text-xs text-slate-500 truncate',
}

const BADGE_SLATE = 'px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600'

export const KPI_CARDS: KpiCard[] = [
  {
    ...KPI_PLAIN,
    status: 'DRAFT',
    labelClass: 'text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1',
    badge: 'Awaiting',
    badgeClass: BADGE_SLATE,
    unit: 'drafts',
    caption: 'Not confirmed yet',
  },
  {
    ...KPI_PLAIN,
    status: 'WAITING',
    labelClass: 'text-[11px] font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1',
    badge: 'Short',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60',
    unit: 'waiting',
    caption: 'Source stock is short',
  },
  {
    status: 'READY',
    labelClass: 'text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1',
    badge: 'Validate Now',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80',
    countClass: 'text-2xl font-bold font-mono text-indigo-700',
    unit: 'to validate',
    caption: 'Source holds every line',
    captionClass: 'mt-2 text-xs text-indigo-900 font-medium truncate',
  },
  {
    ...KPI_PLAIN,
    status: 'DONE',
    labelClass: 'text-[11px] font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1',
    badge: 'Posted',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    unit: 'validated',
    caption: 'Posted to the stock ledger',
  },
  {
    ...KPI_PLAIN,
    status: 'CANCELED',
    labelClass: 'text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1',
    badge: 'Voided',
    badgeClass: BADGE_SLATE,
    unit: 'canceled',
    caption: 'No ledger movement',
  },
]
