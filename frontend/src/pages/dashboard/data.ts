import { ROUTES } from '../../routes.ts'

export type OperationType = 'Receipt' | 'Delivery' | 'Internal' | 'Adjustment'
export type OperationStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled'
export type TypeFilter = 'All' | OperationType

export interface NavLinkItem {
  label: string
  /** Links without a screen stay on href="#" */
  to?: string
}

export interface DockItem extends NavLinkItem {
  icon: string
  badge?: string
  badgeClassName?: string
}

export interface KpiFilterCard {
  type: OperationType
  label: string
  icon: string
  iconBoxClassName: string
  iconClassName: string
  value: string
  caption: string
}

export interface Operation {
  document: string
  type: OperationType
  product: string
  category: string
  /** Matched by the location filter (data-location) */
  location: string
  /** Shown in the Location cell when it differs from data-location */
  locationLabel?: string
  quantity: string
  quantityClassName: string
  status: OperationStatus
  timestamp: string
}

export interface LowStockItem {
  sku: string
  name: string
  stripClassName: string
  badge: string
  badgeClassName: string
  location: string
  stock: string
  stockClassName: string
  threshold: string
  action: string
  actionClassName: string
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
    badge: '12',
    badgeClassName: 'absolute -top-0.5 right-2 px-1 rounded-full bg-secondary-container text-on-secondary-container text-[9px] font-bold',
  },
  {
    label: 'Deliveries',
    icon: 'local_shipping',
    to: ROUTES.deliveries,
    badge: '8',
    badgeClassName: 'absolute -top-0.5 right-2 px-1 rounded-full bg-primary text-on-primary text-[9px] font-bold',
  },
  { label: 'Transfers', icon: 'sync_alt', to: ROUTES.transfers },
  { label: 'Adjustments', icon: 'tune', to: ROUTES.adjustments },
  { label: 'Warehouse', icon: 'warehouse', to: ROUTES.warehouse },
]

// KPI cards 3–5, which filter the ledger by document type
export const KPI_FILTER_CARDS: KpiFilterCard[] = [
  {
    type: 'Receipt',
    label: 'Pending Receipts',
    icon: 'south',
    iconBoxClassName: 'w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center group-hover:bg-secondary-container group-hover:text-on-secondary-container transition-colors',
    iconClassName: 'material-symbols-outlined text-secondary text-[20px]',
    value: '12',
    caption: 'Incoming inbound',
  },
  {
    type: 'Delivery',
    label: 'Pending Deliveries',
    icon: 'north',
    iconBoxClassName: 'w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center group-hover:bg-primary-container group-hover:text-on-primary transition-colors',
    iconClassName: 'material-symbols-outlined text-primary text-[20px]',
    value: '8',
    caption: 'Dispatches ready',
  },
  {
    type: 'Internal',
    label: 'Internal Transfers',
    icon: 'swap_horiz',
    iconBoxClassName: 'w-8 h-8 rounded-lg bg-tertiary-fixed flex items-center justify-center group-hover:bg-tertiary-container group-hover:text-on-tertiary transition-colors',
    iconClassName: 'material-symbols-outlined text-tertiary text-[20px]',
    value: '5',
    caption: 'Inter-hub transit',
  },
]

export const TYPE_FILTERS: { type: TypeFilter; label: string }[] = [
  { type: 'All', label: 'All' },
  { type: 'Receipt', label: 'Receipts' },
  { type: 'Delivery', label: 'Delivery' },
  { type: 'Internal', label: 'Internal' },
  { type: 'Adjustment', label: 'Adjustments' },
]

export const OPERATION_TYPE_ICON: Record<OperationType, { icon: string; className: string }> = {
  Receipt: { icon: 'move_to_inbox', className: 'material-symbols-outlined text-[14px] text-secondary' },
  Delivery: { icon: 'local_shipping', className: 'material-symbols-outlined text-[14px] text-primary' },
  Internal: { icon: 'sync_alt', className: 'material-symbols-outlined text-[14px] text-tertiary' },
  Adjustment: { icon: 'tune', className: 'material-symbols-outlined text-[14px] text-on-surface-variant' },
}

export const OPERATION_STATUS_CLASS: Record<OperationStatus, string> = {
  Done: 'inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container-high text-secondary-fixed-dim bg-secondary font-semibold',
  Ready: 'inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-secondary-fixed text-on-secondary-fixed-variant font-semibold',
  Waiting: 'inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container-high text-on-surface font-semibold',
  Draft: 'inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container text-on-surface-variant font-semibold',
  Canceled: 'inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-error-container text-on-error-container font-semibold',
}

const QTY = 'py-3 px-4 font-metric-tabular-sm text-metric-tabular-sm font-semibold text-right text-on-surface'
const QTY_NEGATIVE = 'py-3 px-4 font-metric-tabular-sm text-metric-tabular-sm font-semibold text-right text-error'

export const OPERATIONS: Operation[] = [
  { document: 'REC-2026-0142', type: 'Receipt', product: 'Steel Rod 20mm', category: 'Raw Materials', location: 'Main Warehouse', quantity: '100 units', quantityClassName: QTY, status: 'Done', timestamp: 'Today, 11:20 AM' },
  { document: 'DEL-2026-0891', type: 'Delivery', product: 'Ergonomic Mesh Chair', category: 'Finished Goods', location: 'West Facility', quantity: '20 units', quantityClassName: QTY, status: 'Ready', timestamp: 'Today, 10:45 AM' },
  { document: 'INT-2026-0304', type: 'Internal', product: 'Server Rack Mounts', category: 'Electronics', location: 'East Depot -> Main', locationLabel: 'East Depot → Main', quantity: '50 units', quantityClassName: QTY, status: 'Waiting', timestamp: 'Yesterday' },
  { document: 'ADJ-2026-0045', type: 'Adjustment', product: 'Copper Cable Spool', category: 'Hardware', location: 'Main Warehouse', quantity: '-4 units', quantityClassName: QTY_NEGATIVE, status: 'Done', timestamp: 'Yesterday' },
  { document: 'REC-2026-0141', type: 'Receipt', product: 'Logic Board V2', category: 'Electronics', location: 'East Depot', quantity: '350 units', quantityClassName: QTY, status: 'Draft', timestamp: '2 days ago' },
  { document: 'DEL-2026-0890', type: 'Delivery', product: 'Industrial Power Supply', category: 'Electronics', location: 'West Facility', quantity: '15 units', quantityClassName: QTY, status: 'Canceled', timestamp: '3 days ago' },
]

// The row's data-search attribute, matched by the ledger search box
export const operationSearchText = (op: Operation) => `${op.document} ${op.product} ${op.category}`

const REORDER_BTN = 'w-full py-1.5 px-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md font-semibold transition-all text-center'

export const LOW_STOCK_ITEMS: LowStockItem[] = [
  {
    sku: 'STL-001',
    name: 'Steel Rod 20mm',
    stripClassName: 'absolute left-0 top-0 bottom-0 w-1.5 bg-error',
    badge: 'Critical',
    badgeClassName: 'px-2 py-0.5 rounded text-[11px] font-semibold bg-error text-on-error uppercase',
    location: 'Main Warehouse',
    stock: '20 KG',
    stockClassName: 'text-error font-mono',
    threshold: '50 KG',
    action: 'Create PO',
    actionClassName: 'w-full py-1.5 px-3 rounded-lg bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:opacity-95 transition-all text-center',
  },
  {
    sku: 'PDU-880',
    name: 'Power Distribution Unit',
    stripClassName: 'absolute left-0 top-0 bottom-0 w-1.5 bg-surface-container-highest',
    badge: 'Low',
    badgeClassName: 'px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-container-high text-on-surface uppercase',
    location: 'West Hub',
    stock: '3 units',
    stockClassName: 'text-on-surface font-mono',
    threshold: '15 units',
    action: 'Reorder',
    actionClassName: REORDER_BTN,
  },
  {
    sku: 'CBL-CAT6',
    name: 'Cat6 Ethernet Spool',
    stripClassName: 'absolute left-0 top-0 bottom-0 w-1.5 bg-surface-container-highest',
    badge: 'Low',
    badgeClassName: 'px-2 py-0.5 rounded text-[11px] font-semibold bg-surface-container-high text-on-surface uppercase',
    location: 'East Depot',
    stock: '2 spools',
    stockClassName: 'text-on-surface font-mono',
    threshold: '10 spools',
    action: 'Reorder',
    actionClassName: REORDER_BTN,
  },
  {
    sku: 'THM-050',
    name: 'Thermal Paste 50g',
    stripClassName: 'absolute left-0 top-0 bottom-0 w-1.5 bg-error',
    badge: 'Out of Stock',
    badgeClassName: 'px-2 py-0.5 rounded text-[11px] font-semibold bg-error-container text-on-error-container uppercase',
    location: 'Main Warehouse',
    stock: '0 units',
    stockClassName: 'text-error font-mono',
    threshold: '25 units',
    action: 'Urgent Expedite',
    actionClassName: 'w-full py-1.5 px-3 rounded-lg bg-error text-on-error font-label-md text-label-md font-semibold hover:opacity-90 transition-all text-center',
  },
]
