export type AdjustmentStatus = 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED'

export type StatusFilter = 'ALL' | AdjustmentStatus

/** Deficit (rose), surplus (emerald) or zero (slate) difference badge */
export type Variance = 'deficit' | 'surplus' | 'zero'

export const STATUS_LABELS: Record<AdjustmentStatus, string> = {
  DRAFT: 'Draft',
  WAITING: 'Waiting',
  READY: 'Ready',
  DONE: 'Done',
  CANCELED: 'Canceled',
}

export interface Adjustment {
  ref: string
  txHash: string
  product: string
  sku: string
  skuNote: string
  warehouse: string
  /** Value matched by the warehouse filter */
  warehouseCode: string
  location: string
  /** Value matched by the location filter */
  locationCode: string
  recordedQty: string
  countedQty: string
  difference: string
  variance: Variance
  reason: string
  reasonNote: string
  /** Reason passed to the quick-apply dialog (the original differs from the table label on one row) */
  applyReason: string
  status: AdjustmentStatus
}

export const ADJUSTMENTS: Adjustment[] = [
  {
    ref: 'ADJ-2026-0089',
    txHash: '0x8f2a...c01',
    product: 'Steel Rod 20mm',
    sku: 'STL-001',
    skuNote: 'Hot Rolled',
    warehouse: 'Main Warehouse (West)',
    warehouseCode: 'WH_WEST',
    location: 'Stock Bay 04-A',
    locationCode: 'BAY_04A',
    recordedQty: '100.00 KG',
    countedQty: '97.00 KG',
    difference: '-3.00 KG',
    variance: 'deficit',
    reason: 'Damaged Stock',
    reasonNote: 'Bent in racking bay',
    applyReason: 'Damaged Stock',
    status: 'READY',
  },
  {
    ref: 'ADJ-2026-0088',
    txHash: '0x41e0...a99',
    product: 'Ergonomic Office Chair',
    sku: 'CHR-002',
    skuNote: 'High Back Mesh',
    warehouse: 'East Depot',
    warehouseCode: 'EAST_DEPOT',
    location: 'Bin 08-C',
    locationCode: 'BIN_08C',
    recordedQty: '45.00 PCS',
    countedQty: '48.00 PCS',
    difference: '+3.00 PCS',
    variance: 'surplus',
    reason: 'Physical Correction',
    reasonNote: 'Unregistered receipt pallet',
    applyReason: 'Physical Count Correction',
    status: 'READY',
  },
  {
    ref: 'ADJ-2026-0087',
    txHash: '0x992b...7fa',
    product: 'Thermal Interface Paste',
    sku: 'THM-050',
    skuNote: '50g Compound',
    warehouse: 'Production Plant B',
    warehouseCode: 'PLANT_B',
    location: 'Racking Sector D-12',
    locationCode: 'SECTOR_D12',
    recordedQty: '25.00 UNITS',
    countedQty: '20.00 UNITS',
    difference: '-5.00 UNITS',
    variance: 'deficit',
    reason: 'Missing Stock',
    reasonNote: 'Line consumption unlogged',
    applyReason: 'Missing Stock',
    status: 'READY',
  },
  {
    ref: 'ADJ-2026-0084',
    txHash: '0x110d...ee8',
    product: 'Cat6 UTP Cable Spool',
    sku: 'CBL-CAT6',
    skuNote: '305m Solid',
    warehouse: 'Main Warehouse (West)',
    warehouseCode: 'WH_WEST',
    location: 'Cold Bin 2',
    locationCode: 'COLD_BIN_2',
    recordedQty: '50.00 BOX',
    countedQty: '50.00 BOX',
    difference: '0.00 BOX',
    variance: 'zero',
    reason: 'Cycle Count',
    reasonNote: 'Zero variance audited',
    applyReason: 'Cycle Count',
    status: 'READY',
  },
]

export const DIFFERENCE_BADGE: Record<Variance, string> = {
  deficit: 'inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60',
  surplus: 'inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  zero: 'inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200',
}

export interface AdjustmentFilters {
  search: string
  status: StatusFilter
  warehouse: string
  location: string
}

// Search covers reference, product, SKU and location (see the search placeholder)
export function matchesAdjustmentFilters(a: Adjustment, filters: AdjustmentFilters): boolean {
  const search = filters.search.toLowerCase().trim()
  const haystack = [a.ref, a.product, a.sku, a.warehouse, a.location].join(' ').toLowerCase()
  const matchesSearch = !search || haystack.includes(search)
  const matchesStatus = filters.status === 'ALL' || a.status === filters.status
  const matchesWh = filters.warehouse === 'ALL' || a.warehouseCode === filters.warehouse
  const matchesLoc = filters.location === 'ALL' || a.locationCode === filters.location
  return matchesSearch && matchesStatus && matchesWh && matchesLoc
}

export interface SelectOption {
  value: string
  label: string
}

export const STATUS_OPTIONS: SelectOption[] = [
  { value: 'READY', label: 'Status: Ready (4)' },
  { value: 'ALL', label: 'All Statuses (18)' },
  { value: 'WAITING', label: 'Waiting Review (3)' },
  { value: 'DONE', label: 'Done (89)' },
  { value: 'DRAFT', label: 'Draft (2)' },
]

export const WAREHOUSE_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Warehouses' },
  { value: 'WH_WEST', label: 'Main Warehouse (West)' },
  { value: 'EAST_DEPOT', label: 'East Depot' },
  { value: 'PLANT_B', label: 'Production Plant B' },
]

export const LOCATION_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Locations & Bins' },
  { value: 'BAY_04A', label: 'Stock Bay 04-A' },
  { value: 'BIN_08C', label: 'Bin 08-C' },
  { value: 'SECTOR_D12', label: 'Racking Sector D-12' },
]

// The original options carry no value attribute, so their value is their text
export const DATE_OPTIONS: SelectOption[] = ['Last 30 Days', 'Today', 'This Week', 'Current Fiscal Quarter'].map((label) => ({ value: label, label }))

export const DEFAULT_DATE = 'Last 30 Days'

export interface KpiCard {
  status: AdjustmentStatus
  /** The highlighted "Ready" card: indigo ring, top bar and check icon */
  elevated: boolean
  label: string
  labelClass: string
  badge: string
  badgeClass: string
  count: string
  countClass: string
  unit: string
  caption: string
  captionClass: string
}

export const KPI_CARD = 'bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all cursor-pointer'
export const KPI_CARD_ELEVATED = 'bg-white rounded-xl border border-indigo-500 ring-2 ring-indigo-500/20 p-5 shadow-md transition-all cursor-pointer relative overflow-hidden'

const KPI_COUNT = 'text-2xl font-bold font-mono text-slate-900'
const KPI_CAPTION = 'mt-2 text-xs text-slate-500 truncate'

export const KPI_CARDS: KpiCard[] = [
  {
    status: 'DRAFT',
    elevated: false,
    label: 'Draft',
    labelClass: 'text-[11px] font-semibold uppercase tracking-wider text-slate-500',
    badge: 'Awaiting',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600',
    count: '2',
    countClass: KPI_COUNT,
    unit: 'items',
    caption: 'Uncounted draft sheets',
    captionClass: KPI_CAPTION,
  },
  {
    status: 'WAITING',
    elevated: false,
    label: 'Waiting',
    labelClass: 'text-[11px] font-semibold uppercase tracking-wider text-amber-700',
    badge: 'In Review',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60',
    count: '3',
    countClass: KPI_COUNT,
    unit: 'items',
    caption: 'Second-verifier count',
    captionClass: KPI_CAPTION,
  },
  {
    status: 'READY',
    elevated: true,
    label: 'Ready',
    labelClass: 'text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1',
    badge: 'Validate Now',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80',
    count: '4',
    countClass: 'text-2xl font-bold font-mono text-indigo-700',
    unit: 'to apply',
    caption: 'Reconciliation verified',
    captionClass: 'mt-2 text-xs text-indigo-900 font-medium truncate',
  },
  {
    status: 'DONE',
    elevated: false,
    label: 'Done',
    labelClass: 'text-[11px] font-semibold uppercase tracking-wider text-emerald-700',
    badge: 'Posted',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    count: '89',
    countClass: KPI_COUNT,
    unit: 'applied',
    caption: 'Atomic ledger synced',
    captionClass: KPI_CAPTION,
  },
  {
    status: 'CANCELED',
    elevated: false,
    label: 'Canceled',
    labelClass: 'text-[11px] font-semibold uppercase tracking-wider text-slate-500',
    badge: 'Voided',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600',
    count: '2',
    countClass: KPI_COUNT,
    unit: 'voided',
    caption: 'Discrepancy canceled',
    captionClass: KPI_CAPTION,
  },
]

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function buildAdjustmentsCsv(rows: Adjustment[]): string {
  const header = ['Reference', 'Product', 'SKU', 'Warehouse', 'Location', 'Recorded Qty', 'Counted Qty', 'Difference', 'Reason', 'Status']
  const lines = rows.map((a) =>
    [a.ref, a.product, a.sku, a.warehouse, a.location, a.recordedQty, a.countedQty, a.difference, a.reason, STATUS_LABELS[a.status]].map(csvCell).join(','),
  )
  return [header.join(','), ...lines].join('\n')
}
