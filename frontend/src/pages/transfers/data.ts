export type TransferStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled'

export type StatusFilter = 'ALL' | TransferStatus

/** Details the atomic validation dialog is opened with */
export interface ValidateTarget {
  ref: string
  product: string
  qty: string
  srcWh: string
  srcLoc: string
  dstWh: string
  dstLoc: string
}

export type TransferRowStatus = 'Ready' | 'Waiting' | 'Done'

export interface Transfer {
  ref: string
  status: TransferRowStatus
  batch: string
  source: { warehouse: string; location: string }
  destination: { icon: string; warehouse: string; location: string }
  items: string
  quantity: string
  product: string
  date: string
  time: string
  /** Validation dialog details (Ready rows) */
  validation?: ValidateTarget
  /** Arrival note shown in the actions cell (Waiting rows) */
  eta?: string
}

export const TRANSFER_00142_VALIDATION: ValidateTarget = {
  ref: 'WH/INT/00142',
  product: 'Steel Rod 20mm',
  qty: '150 KG',
  srcWh: 'Main Warehouse (West)',
  srcLoc: 'Stock Bay 04-A',
  dstWh: 'East Depot',
  dstLoc: 'Receiving Dock Bay 01',
}

export const TRANSFERS: Transfer[] = [
  {
    ref: 'WH/INT/00142',
    status: 'Ready',
    batch: 'BATCH-2026-09A',
    source: { warehouse: 'Main Warehouse (West)', location: 'Stock Bay 04-A (Cold Bin 2)' },
    destination: { icon: 'location_on', warehouse: 'East Depot', location: 'Receiving Dock Bay 01' },
    items: '1 line',
    quantity: '150 KG',
    product: 'Steel Rods 20mm',
    date: 'Today, 05 Sep',
    time: '14:00 IST',
    validation: TRANSFER_00142_VALIDATION,
  },
  {
    ref: 'WH/INT/00141',
    status: 'Ready',
    batch: 'BATCH-2026-09A',
    source: { warehouse: 'Main Warehouse (West)', location: 'Racking Sector D-12' },
    destination: { icon: 'precision_manufacturing', warehouse: 'Production Floor', location: 'SMT Line Buffer Bin 04' },
    items: '3 lines',
    quantity: '450 PCS',
    product: 'Microcontrollers & ICs',
    date: 'Today, 05 Sep',
    time: '15:30 IST',
    validation: {
      ref: 'WH/INT/00141',
      product: 'STM32 Microcontrollers',
      qty: '450 PCS',
      srcWh: 'Main Warehouse (West)',
      srcLoc: 'Racking Sector D-12',
      dstWh: 'Production Floor',
      dstLoc: 'SMT Line Buffer Bin 04',
    },
  },
  {
    ref: 'WH/INT/00140',
    status: 'Ready',
    batch: 'BATCH-2026-08K',
    source: { warehouse: 'East Depot', location: 'Receiving Bay 02' },
    destination: { icon: 'ac_unit', warehouse: 'Cold Chain Hub', location: 'Chilled Cell -18°C' },
    items: '2 lines',
    quantity: '80 BOX',
    product: 'Enzyme Stabilizers',
    date: '06 Sep 2026',
    time: '09:00 IST',
    validation: {
      ref: 'WH/INT/00140',
      product: 'Bio Enzymes Lot 4',
      qty: '80 BOX',
      srcWh: 'East Depot',
      srcLoc: 'Receiving Bay 02',
      dstWh: 'Cold Chain Hub',
      dstLoc: 'Chilled Cell -18°C',
    },
  },
  {
    ref: 'WH/INT/00139',
    status: 'Waiting',
    batch: 'TRUCK-KA-01-2291',
    source: { warehouse: 'Main Warehouse (West)', location: 'Dispatch Gate 03' },
    destination: { icon: 'warehouse', warehouse: 'East Depot', location: 'Yard Intake Buffer' },
    items: '4 lines',
    quantity: '1,200 PCS',
    product: 'Heavy Brass Fasteners',
    date: '04 Sep 2026',
    time: 'Dispatched 18:20',
    eta: 'Docking in 40m',
  },
  {
    ref: 'WH/INT/00138',
    status: 'Done',
    batch: 'LEDGER-TX-9904',
    source: { warehouse: 'Main Warehouse (West)', location: 'Storage Aisle 01-B' },
    destination: { icon: 'precision_manufacturing', warehouse: 'Production Floor', location: 'Kitting Cell Gamma' },
    items: '1 line',
    quantity: '350 BOX',
    product: 'Corrugated Liners',
    date: '03 Sep 2026',
    time: '10:15 IST',
  },
]

export interface RowTone {
  refIcon: string
  refIconClass: string
  refTextClass: string
  destinationIconClass: string
}

export const ROW_TONES: Record<TransferRowStatus, RowTone> = {
  Ready: {
    refIcon: 'swap_horiz',
    refIconClass: 'material-symbols-outlined text-[16px] text-indigo-600',
    refTextClass: 'font-bold text-indigo-600 group-hover:underline',
    destinationIconClass: 'material-symbols-outlined text-[16px] text-indigo-600 mt-0.5',
  },
  Waiting: {
    refIcon: 'local_shipping',
    refIconClass: 'material-symbols-outlined text-[16px] text-amber-600',
    refTextClass: 'font-bold text-slate-800 group-hover:underline',
    destinationIconClass: 'material-symbols-outlined text-[16px] text-slate-400 mt-0.5',
  },
  Done: {
    refIcon: 'done_all',
    refIconClass: 'material-symbols-outlined text-[16px] text-emerald-600',
    refTextClass: 'font-bold text-slate-800 group-hover:underline',
    destinationIconClass: 'material-symbols-outlined text-[16px] text-slate-400 mt-0.5',
  },
}

// KPI summary cards: static in the original (filterByStatus only syncs the status select)
export const KPI_CARD_ACTIVE = 'bg-white rounded-xl border border-indigo-500 ring-2 ring-indigo-500/20 p-5 shadow-md transition-all cursor-pointer relative overflow-hidden'
export const KPI_CARD_INACTIVE = 'bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all cursor-pointer'

export interface KpiCard {
  status: TransferStatus
  /** Elevated card with the top accent bar and filled check icon */
  active?: boolean
  labelClass: string
  badge: string
  badgeClass: string
  count: string
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
    status: 'Draft',
    labelClass: 'text-[11px] font-semibold uppercase tracking-wider text-slate-500',
    badge: 'Awaiting',
    badgeClass: BADGE_SLATE,
    count: '3',
    unit: 'items',
    caption: 'Unvalidated draft notes',
  },
  {
    ...KPI_PLAIN,
    status: 'Waiting',
    labelClass: 'text-[11px] font-semibold uppercase tracking-wider text-amber-700',
    badge: 'In Transit',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60',
    count: '2',
    unit: 'consignments',
    caption: 'Inter-berth movement',
  },
  {
    status: 'Ready',
    active: true,
    labelClass: 'text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1',
    badge: 'Validate Now',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80',
    count: '5',
    countClass: 'text-2xl font-bold font-mono text-indigo-700',
    unit: 'to validate',
    caption: 'Staged & verified at docks',
    captionClass: 'mt-2 text-xs text-indigo-900 font-medium truncate',
  },
  {
    ...KPI_PLAIN,
    status: 'Done',
    labelClass: 'text-[11px] font-semibold uppercase tracking-wider text-emerald-700',
    badge: 'Posted',
    badgeClass: 'px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    count: '34',
    unit: 'validated',
    caption: 'Atomic ledger synced',
  },
  {
    ...KPI_PLAIN,
    status: 'Canceled',
    labelClass: 'text-[11px] font-semibold uppercase tracking-wider text-slate-500',
    badge: 'Voided',
    badgeClass: BADGE_SLATE,
    count: '1',
    unit: 'zeroed',
    caption: 'No ledger movement',
  },
]

export interface SelectOption {
  /** Omitted when the original <option> has no value attribute */
  value?: string
  label: string
}

export const STATUS_OPTIONS: SelectOption[] = [
  { value: 'Ready', label: 'Status: Ready' },
  { value: 'ALL', label: 'All Statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Waiting', label: 'Waiting' },
  { value: 'Done', label: 'Done' },
  { value: 'Canceled', label: 'Canceled' },
]

export const WAREHOUSE_OPTIONS: SelectOption[] = [
  { label: 'All Warehouses' },
  { label: 'Main Warehouse (West)' },
  { label: 'East Depot' },
  { label: 'Production Plant B' },
  { label: 'Cold Chain Hub' },
]

export const LOCATION_OPTIONS: SelectOption[] = [
  { label: 'All Locations' },
  { label: 'Stock Bay 04-A' },
  { label: 'Receiving Dock Bay 01' },
  { label: 'Raw Material Silo #2' },
  { label: 'Assembly Staging Rack C' },
]

export const DATE_OPTIONS: SelectOption[] = [
  { label: 'Last 30 Days' },
  { label: 'Today' },
  { label: 'This Week' },
  { label: 'Current Fiscal Quarter' },
]

// New transfer modal location pickers
export const SOURCE_WAREHOUSE_OPTIONS: SelectOption[] = [
  { value: 'WH_WEST', label: 'Main Warehouse (West)' },
  { value: 'EAST_DEPOT', label: 'East Depot' },
  { value: 'PLANT_B', label: 'Production Plant B' },
]

export const SOURCE_LOCATION_OPTIONS: SelectOption[] = [
  { value: 'BAY_04A', label: 'Stock Bay 04-A (Cold Bin 2)' },
  { value: 'AISLE_01B', label: 'Storage Aisle 01-B' },
  { value: 'SECTOR_D12', label: 'Racking Sector D-12' },
]

export const DEST_WAREHOUSE_OPTIONS: SelectOption[] = [
  { value: 'EAST_DEPOT', label: 'East Depot' },
  { value: 'WH_WEST', label: 'Main Warehouse (West)' },
  { value: 'PLANT_B', label: 'Production Plant B' },
]

export const DEST_LOCATION_OPTIONS: SelectOption[] = [
  { value: 'REC_01', label: 'Receiving Dock Bay 01' },
  { value: 'STAGING_YARD', label: 'Staging Yard 02' },
  { value: 'ASSEMBLY_C', label: 'Assembly Line Staging Rack C' },
]

/** Unreserved stock of the single transfer line at the source bay */
export const MAX_TRANSFER_QTY = 500
