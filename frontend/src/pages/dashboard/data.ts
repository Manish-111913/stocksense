import type { DashboardSummary, DocumentStatus, MovementType, OperationRow, ProductStockLevel } from '../../api/types.ts'
import { formatQty } from '../products/productsData.ts'
import { receiptPath, ROUTES } from '../../routes.ts'

export type TypeFilter = 'All' | MovementType

export interface NavLinkItem {
  label: string
  /** Links without a screen stay on href="#" */
  to?: string
}

export interface DockItem extends NavLinkItem {
  icon: string
  /** Summary counter shown as a badge (hidden when zero) */
  badgeKey?: keyof DashboardSummary
  badgeClassName?: string
}

export interface KpiFilterCard {
  type: MovementType
  label: string
  icon: string
  iconBoxClassName: string
  iconClassName: string
  valueKey: keyof DashboardSummary
  caption: string
}

// Header nav links after the active Dashboard link
export const HEADER_NAV_LINKS: NavLinkItem[] = [
  { label: 'Products', to: ROUTES.products },
  { label: 'Receipts', to: ROUTES.receipts },
  { label: 'Deliveries', to: ROUTES.deliveries },
  { label: 'Transfers', to: ROUTES.transfers },
  { label: 'Adjustments', to: ROUTES.adjustments },
  { label: 'Warehouse', to: ROUTES.warehouse },
]

// Floating dock links after the active Dashboard link
export const DOCK_ITEMS: DockItem[] = [
  { label: 'Products', icon: 'inventory_2', to: ROUTES.products },
  {
    label: 'Receipts',
    icon: 'move_to_inbox',
    to: ROUTES.receipts,
    badgeKey: 'pendingReceipts',
    badgeClassName: 'absolute -top-0.5 right-2 px-1 rounded-full bg-secondary-container text-on-secondary-container text-[9px] font-bold',
  },
  {
    label: 'Deliveries',
    icon: 'local_shipping',
    to: ROUTES.deliveries,
    badgeKey: 'pendingDeliveries',
    badgeClassName: 'absolute -top-0.5 right-2 px-1 rounded-full bg-primary text-on-primary text-[9px] font-bold',
  },
  { label: 'Transfers', icon: 'sync_alt', to: ROUTES.transfers },
  { label: 'Adjustments', icon: 'tune', to: ROUTES.adjustments },
  { label: 'Warehouse', icon: 'warehouse', to: ROUTES.warehouse },
]

// KPI cards 3–5, which filter the ledger by document type (counts are DRAFT / WAITING / READY documents)
export const KPI_FILTER_CARDS: KpiFilterCard[] = [
  {
    type: 'RECEIPT',
    label: 'Pending Receipts',
    icon: 'south',
    iconBoxClassName: 'w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center group-hover:bg-secondary-container group-hover:text-on-secondary-container transition-colors',
    iconClassName: 'material-symbols-outlined text-secondary text-[20px]',
    valueKey: 'pendingReceipts',
    caption: 'Incoming inbound',
  },
  {
    type: 'DELIVERY',
    label: 'Pending Deliveries',
    icon: 'north',
    iconBoxClassName: 'w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center group-hover:bg-primary-container group-hover:text-on-primary transition-colors',
    iconClassName: 'material-symbols-outlined text-primary text-[20px]',
    valueKey: 'pendingDeliveries',
    caption: 'Outgoing dispatches',
  },
  {
    type: 'INTERNAL_TRANSFER',
    label: 'Internal Transfers',
    icon: 'swap_horiz',
    iconBoxClassName: 'w-8 h-8 rounded-lg bg-tertiary-fixed flex items-center justify-center group-hover:bg-tertiary-container group-hover:text-on-tertiary transition-colors',
    iconClassName: 'material-symbols-outlined text-tertiary text-[20px]',
    valueKey: 'scheduledTransfers',
    caption: 'Scheduled moves',
  },
]

export const TYPE_FILTERS: { type: TypeFilter; label: string }[] = [
  { type: 'All', label: 'All' },
  { type: 'RECEIPT', label: 'Receipts' },
  { type: 'DELIVERY', label: 'Delivery' },
  { type: 'INTERNAL_TRANSFER', label: 'Internal' },
  { type: 'ADJUSTMENT', label: 'Adjustments' },
]

export const STATUS_OPTIONS: DocumentStatus[] = ['DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED']

export const OPERATION_TYPE_LABEL: Record<MovementType, string> = {
  RECEIPT: 'Receipt',
  DELIVERY: 'Delivery',
  INTERNAL_TRANSFER: 'Internal',
  ADJUSTMENT: 'Adjustment',
}

export const OPERATION_TYPE_ICON: Record<MovementType, { icon: string; className: string }> = {
  RECEIPT: { icon: 'move_to_inbox', className: 'material-symbols-outlined text-[14px] text-secondary' },
  DELIVERY: { icon: 'local_shipping', className: 'material-symbols-outlined text-[14px] text-primary' },
  INTERNAL_TRANSFER: { icon: 'sync_alt', className: 'material-symbols-outlined text-[14px] text-tertiary' },
  ADJUSTMENT: { icon: 'tune', className: 'material-symbols-outlined text-[14px] text-on-surface-variant' },
}

export const OPERATION_STATUS_CLASS: Record<DocumentStatus, string> = {
  DONE: 'inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container-high text-secondary-fixed-dim bg-secondary font-semibold',
  READY: 'inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-secondary-fixed text-on-secondary-fixed-variant font-semibold',
  WAITING: 'inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container-high text-on-surface font-semibold',
  DRAFT: 'inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container text-on-surface-variant font-semibold',
  CANCELED: 'inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-error-container text-on-error-container font-semibold',
}

export const QTY_CLASS = 'py-3 px-4 font-metric-tabular-sm text-metric-tabular-sm font-semibold text-right text-on-surface'
export const QTY_NEGATIVE_CLASS = 'py-3 px-4 font-metric-tabular-sm text-metric-tabular-sm font-semibold text-right text-error'

/** Where a ledger row opens: receipts have a detail page, the other documents open their list screen */
export function operationPath(op: OperationRow) {
  switch (op.documentType) {
    case 'RECEIPT':
      return receiptPath(op.documentId)
    case 'DELIVERY':
      return ROUTES.deliveries
    case 'INTERNAL_TRANSFER':
      return ROUTES.transfers
    case 'ADJUSTMENT':
      return ROUTES.adjustments
  }
}

const place = (p: { warehouseName: string; locationName: string }) => `${p.warehouseName} / ${p.locationName}`

export function operationLocation(op: OperationRow) {
  return op.destination ? `${place(op.location)} → ${place(op.destination)}` : place(op.location)
}

/** Adjustments carry a signed difference; everything else is a line quantity */
export function operationQuantity(op: OperationRow) {
  const sign = op.documentType === 'ADJUSTMENT' && op.quantity > 0 ? '+' : ''
  return `${sign}${formatQty(op.quantity)} ${op.product.unitOfMeasure}`
}

export function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const csvCell = (value: string | number) => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function operationsCsv(rows: OperationRow[]) {
  const header = ['Reference', 'Type', 'Status', 'Date', 'Product', 'SKU', 'Category', 'Location', 'Partner / Reason', 'Quantity', 'Unit']
  const lines = rows.map((op) =>
    [op.reference, OPERATION_TYPE_LABEL[op.documentType], op.status, op.date, op.product.name, op.product.sku, op.category.name, operationLocation(op), op.partner ?? '', op.quantity, op.product.unitOfMeasure]
      .map(csvCell)
      .join(','),
  )
  return [header.join(','), ...lines].join('\n')
}

/** Out-of-stock items first, then low stock */
export interface StockAlert {
  item: ProductStockLevel
  isOut: boolean
}

export const ALERT_STRIP = {
  out: 'absolute left-0 top-0 bottom-0 w-1.5 bg-error',
  low: 'absolute left-0 top-0 bottom-0 w-1.5 bg-surface-container-highest',
}

export const ALERT_BADGE = {
  out: 'px-2 py-0.5 rounded text-[11px] font-semibold bg-error-container text-on-error-container uppercase',
  low: 'px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-container-high text-on-surface uppercase',
}

export const ALERT_STOCK = {
  out: 'text-error font-mono',
  low: 'text-on-surface font-mono',
}

export const ALERT_ACTION = {
  out: 'w-full py-1.5 px-3 rounded-lg bg-error text-on-error font-label-md text-label-md font-semibold hover:opacity-90 transition-all text-center',
  low: 'w-full py-1.5 px-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md font-semibold transition-all text-center',
}
