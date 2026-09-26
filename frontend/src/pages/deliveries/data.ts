// Helpers for the Deliveries screen (/deliveries): list, create / edit form and detail views
import { ApiError } from '../../api/client.ts'
import type { DeliveryInput } from '../../api/deliveries.ts'
import type { Delivery, DocumentStatus } from '../../api/types.ts'
import { formatQty } from '../products/productsData.ts'
import { parseQty, todayIso } from '../receipts/new/data.ts'

/** In-page views: the list stays mounted, the form and detail views load their delivery by id */
export type DeliveryView = { kind: 'list' } | { kind: 'form'; id: string | null } | { kind: 'detail'; id: string }

/** Only DRAFT and WAITING deliveries can be edited (the backend answers 409 otherwise) */
export const isEditableStatus = (status: DocumentStatus) => status === 'DRAFT' || status === 'WAITING'

/** Delivery dates are stored as UTC midnight: format them in UTC so the day doesn't shift */
export function formatDeliveryDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export const linesLabel = (count: number) => `${count} ${count === 1 ? 'line' : 'lines'}`

/** "40 KG" when every line shares a unit, "40 units" otherwise */
export function deliveryQuantityLabel(delivery: Delivery) {
  const units = new Set(delivery.items.map((item) => item.unitOfMeasure))
  const unit = units.size === 1 ? [...units][0] : delivery.items.length > 0 ? 'units' : ''
  return `${formatQty(Number(delivery.totalQuantity))} ${unit}`.trim()
}

/** Lines that are short at the source location right now */
export const shortLines = (delivery: Delivery) => delivery.items.filter((item) => Number(item.shortage) > 0)

/** 409 raised by validate when a line no longer has enough stock (nothing was changed) */
export function isInsufficientStock(err: unknown) {
  return err instanceof ApiError && err.code === 'INSUFFICIENT_STOCK'
}

/* ---------- Create / edit form ---------- */

export interface DeliveryLine {
  productId: string
  name: string
  sku: string
  unit: string
  /** Raw input value, so the field can be cleared while typing */
  qty: string
}

export interface DeliveryForm {
  customerId: string
  warehouseId: string
  sourceLocationId: string
  /** YYYY-MM-DD */
  deliveryDate: string
  lines: DeliveryLine[]
}

export const emptyDeliveryForm = (): DeliveryForm => ({ customerId: '', warehouseId: '', sourceLocationId: '', deliveryDate: todayIso(), lines: [] })

export function formFromDelivery(delivery: Delivery): DeliveryForm {
  return {
    customerId: delivery.customer.id,
    warehouseId: delivery.warehouse.id,
    sourceLocationId: delivery.sourceLocation.id,
    deliveryDate: delivery.deliveryDate.slice(0, 10),
    lines: delivery.items.map((item) => ({ productId: item.productId, name: item.productName, sku: item.sku, unit: item.unitOfMeasure, qty: String(Number(item.quantity)) })),
  }
}

/** Payload for createDelivery / updateDelivery (call once every quantity parses) */
export function toDeliveryInput(form: DeliveryForm): DeliveryInput {
  return {
    customerId: form.customerId,
    warehouseId: form.warehouseId,
    sourceLocationId: form.sourceLocationId,
    deliveryDate: form.deliveryDate,
    items: form.lines.map((line) => ({ productId: line.productId, quantity: parseQty(line.qty) ?? 0 })),
  }
}

/** Comparable snapshot of the form, used to detect unsaved changes */
export function deliveryFormKey(form: DeliveryForm) {
  return JSON.stringify([form.customerId, form.warehouseId, form.sourceLocationId, form.deliveryDate, form.lines.map((line) => [line.productId, parseQty(line.qty) ?? line.qty])])
}

/* ---------- List table ---------- */

export interface RowTone {
  rowClass: string
  refCellClass: string
  refIcon: string
  refIconClass: string
  dateCellClass: string
  timeClass: string
}

const ROW_CLASS = 'hover:bg-slate-50/80 transition-colors group'
const DATE_CELL = 'py-3 px-4 text-slate-600 whitespace-nowrap'
const TIME_CLASS = 'text-[10px] text-slate-400 font-mono'

export const ROW_TONES: Record<DocumentStatus, RowTone> = {
  READY: {
    rowClass: ROW_CLASS,
    refCellClass: 'py-3 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap',
    refIcon: 'local_shipping',
    refIconClass: 'material-symbols-outlined text-[15px] text-indigo-500',
    dateCellClass: DATE_CELL,
    timeClass: TIME_CLASS,
  },
  WAITING: {
    rowClass: ROW_CLASS,
    refCellClass: 'py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap',
    refIcon: 'hourglass_top',
    refIconClass: 'material-symbols-outlined text-[15px] text-amber-500',
    dateCellClass: DATE_CELL,
    timeClass: TIME_CLASS,
  },
  DRAFT: {
    rowClass: ROW_CLASS,
    refCellClass: 'py-3 px-4 font-mono font-bold text-slate-500 whitespace-nowrap',
    refIcon: 'edit_note',
    refIconClass: 'material-symbols-outlined text-[15px] text-slate-400',
    dateCellClass: DATE_CELL,
    timeClass: TIME_CLASS,
  },
  DONE: {
    rowClass: ROW_CLASS,
    refCellClass: 'py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap',
    refIcon: 'check_circle',
    refIconClass: 'material-symbols-outlined text-[15px] text-emerald-500',
    dateCellClass: DATE_CELL,
    timeClass: 'text-[10px] text-emerald-600 font-mono',
  },
  CANCELED: {
    rowClass: 'hover:bg-slate-50/80 transition-colors group opacity-75',
    refCellClass: 'py-3 px-4 font-mono font-bold text-slate-400 line-through whitespace-nowrap',
    refIcon: 'cancel',
    refIconClass: 'material-symbols-outlined text-[15px] text-rose-400',
    dateCellClass: 'py-3 px-4 text-slate-400 whitespace-nowrap',
    timeClass: TIME_CLASS,
  },
}

/* ---------- KPI summary cards ---------- */

// The selected card swaps the outer class; each card's inner styling stays fixed
export const KPI_CARD_ACTIVE = 'delivery-kpi-card bg-indigo-50/50 rounded-xl border-2 border-indigo-500/80 p-3.5 shadow-xs cursor-pointer transition-all flex flex-col justify-between group'
export const KPI_CARD_INACTIVE = 'delivery-kpi-card bg-white rounded-xl border border-slate-200/80 p-3.5 hover:border-slate-300 shadow-xs cursor-pointer transition-all flex flex-col justify-between group'

export interface KpiCard {
  status: DocumentStatus
  labelClass: string
  iconClass: string
  icon: string
  countClass: string
  unit: string
  unitClass: string
  footClass: string
  caption: string
  badgeClass: string
  badge: string
}

const KPI_COUNT = 'text-2xl font-bold text-slate-900'
const KPI_FOOT = 'mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500'

export const KPI_CARDS: KpiCard[] = [
  {
    status: 'DRAFT',
    labelClass: 'text-xs font-bold uppercase tracking-wider text-slate-500',
    iconClass: 'w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:scale-110 transition-transform',
    icon: 'edit_note',
    countClass: KPI_COUNT,
    unit: 'drafts',
    unitClass: 'text-xs text-slate-400 font-medium',
    footClass: KPI_FOOT,
    caption: 'Not yet confirmed',
    badgeClass: 'font-mono font-medium text-slate-600',
    badge: 'Editable',
  },
  {
    status: 'WAITING',
    labelClass: 'text-xs font-bold uppercase tracking-wider text-amber-700',
    iconClass: 'w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform',
    icon: 'hourglass_top',
    countClass: KPI_COUNT,
    unit: 'short on stock',
    unitClass: 'text-xs text-amber-600 font-medium',
    footClass: KPI_FOOT,
    caption: 'Awaiting stock',
    badgeClass: 'font-mono font-medium text-amber-700',
    badge: 'Recheck',
  },
  {
    status: 'READY',
    labelClass: 'text-xs font-bold uppercase tracking-wider text-indigo-700',
    iconClass: 'w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 group-hover:scale-110 transition-transform',
    icon: 'verified',
    countClass: 'text-2xl font-bold text-indigo-900',
    unit: 'to ship',
    unitClass: 'text-xs text-indigo-600 font-semibold',
    footClass: 'mt-3 pt-2.5 border-t border-indigo-200/60 flex items-center justify-between text-xs text-indigo-800 font-medium',
    caption: 'Pick & Pack',
    badgeClass: 'px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[10px] tracking-wide uppercase',
    badge: 'In Stock',
  },
  {
    status: 'DONE',
    labelClass: 'text-xs font-bold uppercase tracking-wider text-emerald-700',
    iconClass: 'w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform',
    icon: 'check_circle',
    countClass: KPI_COUNT,
    unit: 'delivered',
    unitClass: 'text-xs text-emerald-600 font-medium',
    footClass: KPI_FOOT,
    caption: 'Stock Ledger',
    badgeClass: 'font-mono font-medium text-emerald-700',
    badge: 'Posted',
  },
  {
    status: 'CANCELED',
    labelClass: 'text-xs font-bold uppercase tracking-wider text-rose-700',
    iconClass: 'w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform',
    icon: 'cancel',
    countClass: KPI_COUNT,
    unit: 'canceled',
    unitClass: 'text-xs text-rose-500 font-medium',
    footClass: KPI_FOOT,
    caption: 'No stock movement',
    badgeClass: 'font-mono font-medium text-slate-400',
    badge: 'Voided',
  },
]
