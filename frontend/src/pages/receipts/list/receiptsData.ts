export type ReceiptStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled'

export type StatusFilter = 'ALL' | ReceiptStatus

export interface Receipt {
  ref: string
  /** Current lifecycle status: drives data-status, the badge, the action buttons and filtering */
  status: ReceiptStatus
  /** Status the row was loaded with: its reference cell / muted styling stay put after validation */
  tone: ReceiptStatus
  supplier: string
  supplierCode: string
  /** data-wh value matched by the warehouse filter */
  warehouse: string
  destination: string
  destinationIcon: string
  zone: string
  items: string
  quantity: string
  quantityNote: string
  date: string
  time: string
  /** Quick-validate modal details (Ready rows) */
  validation?: { quantity: string; location: string }
}

export interface ValidateTarget {
  ref: string
  supplier: string
  quantity: string
  location: string
}

export const INITIAL_RECEIPTS: Receipt[] = [
  {
    ref: 'WH/IN/00042',
    status: 'Ready',
    tone: 'Ready',
    supplier: 'Apex Industrial Metals',
    supplierCode: 'SUP-IND-9021',
    warehouse: 'Main Warehouse',
    destination: 'Main Warehouse (West)',
    destinationIcon: 'warehouse',
    zone: 'Receiving Dock Zone A',
    items: '3 lines',
    quantity: '500 KG',
    quantityNote: 'High-Tensile Bar',
    date: '05 Sep 2026',
    time: '11:20 AM IST',
    validation: { quantity: '500 KG (3 lines)', location: 'Dock Zone A' },
  },
  {
    ref: 'WH/IN/00041',
    status: 'Draft',
    tone: 'Draft',
    supplier: 'Precision Fasteners Ltd',
    supplierCode: 'SUP-FST-1140',
    warehouse: 'East Depot',
    destination: 'East Depot',
    destinationIcon: 'warehouse',
    zone: 'Staging Berth 02',
    items: '1 SKU',
    quantity: '1,200 PCS',
    quantityNote: 'M8 Hex Bolts',
    date: '05 Sep 2026',
    time: '09:45 AM IST',
  },
  {
    ref: 'WH/IN/00040',
    status: 'Done',
    tone: 'Done',
    supplier: 'Global Logistics Partners',
    supplierCode: 'SUP-LOG-4498',
    warehouse: 'Main Warehouse',
    destination: 'Main Warehouse (West)',
    destinationIcon: 'warehouse',
    zone: 'Storage Aisle 04-B',
    items: '5 lines',
    quantity: 'Multi-Unit (5 lines)',
    quantityNote: 'Palletized Crate',
    date: '04 Sep 2026',
    time: '16:15 PM IST',
  },
  {
    ref: 'WH/IN/00039',
    status: 'Waiting',
    tone: 'Waiting',
    supplier: 'TechnoCore Electronics',
    supplierCode: 'SUP-ELC-8822',
    warehouse: 'Production Floor',
    destination: 'Production Floor',
    destinationIcon: 'precision_manufacturing',
    zone: 'SMT Buffer Cage',
    items: '2 lines',
    quantity: '450 PCS',
    quantityNote: 'Microcontrollers',
    date: '04 Sep 2026',
    time: '14:00 PM IST',
  },
  {
    ref: 'WH/IN/00038',
    status: 'Done',
    tone: 'Done',
    supplier: 'Apex Industrial Metals',
    supplierCode: 'SUP-IND-9021',
    warehouse: 'Main Warehouse',
    destination: 'Main Warehouse (West)',
    destinationIcon: 'warehouse',
    zone: 'Heavy Racking R-01',
    items: '1 SKU',
    quantity: '800 KG',
    quantityNote: 'Alloy Sheet 4mm',
    date: '03 Sep 2026',
    time: '10:10 AM IST',
  },
  {
    ref: 'WH/IN/00037',
    status: 'Ready',
    tone: 'Ready',
    supplier: 'EcoPulp Packaging',
    supplierCode: 'SUP-PKG-3012',
    warehouse: 'East Depot',
    destination: 'East Depot',
    destinationIcon: 'warehouse',
    zone: 'Receiving Bay 01',
    items: '4 lines',
    quantity: '350 BOX',
    quantityNote: 'Corrugated Carton',
    date: '02 Sep 2026',
    time: '15:40 PM IST',
    validation: { quantity: '350 BOX (4 lines)', location: 'Receiving Bay 01' },
  },
  {
    ref: 'WH/IN/00036',
    status: 'Canceled',
    tone: 'Canceled',
    supplier: 'Precision Fasteners Ltd',
    supplierCode: 'SUP-FST-1140',
    warehouse: 'Main Warehouse',
    destination: 'Main Warehouse (West)',
    destinationIcon: 'warehouse',
    zone: 'Staging Discard Area',
    items: '1 SKU',
    quantity: '0 PCS',
    quantityNote: 'Damaged Inbound',
    date: '01 Sep 2026',
    time: '11:00 AM IST',
  },
]

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
  rowClass: 'hover:bg-slate-50/80 transition-colors group',
  supplierClass: 'font-semibold text-slate-900 flex items-center gap-1.5',
  destinationClass: 'font-semibold text-slate-800 flex items-center gap-1.5',
  itemsClass: 'px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-medium text-slate-700 border border-slate-200/60',
  quantityClass: 'font-mono font-bold text-slate-900 text-xs',
  dateClass: 'font-mono text-slate-700 text-[11px]',
}

const REF_LINK_PLAIN = 'inline-flex items-center gap-2 font-mono font-bold text-slate-800 hover:text-indigo-600 transition-colors'

export const ROW_TONES: Record<ReceiptStatus, RowTone> = {
  Ready: {
    ...ROW_BASE,
    refLinkClass: 'inline-flex items-center gap-2 font-mono font-bold text-indigo-600 hover:text-indigo-800 transition-colors',
    refIconClass: 'w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center',
    refIcon: 'description',
  },
  Draft: {
    ...ROW_BASE,
    refLinkClass: REF_LINK_PLAIN,
    refIconClass: 'w-6 h-6 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center',
    refIcon: 'edit_note',
  },
  Done: {
    ...ROW_BASE,
    refLinkClass: REF_LINK_PLAIN,
    refIconClass: 'w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center',
    refIcon: 'call_received',
  },
  Waiting: {
    ...ROW_BASE,
    refLinkClass: REF_LINK_PLAIN,
    refIconClass: 'w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center',
    refIcon: 'local_shipping',
  },
  Canceled: {
    rowClass: 'hover:bg-slate-50/80 transition-colors group opacity-75',
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

// Text the status badge and action cell contribute to the row's innerText (icon ligatures included)
const BADGE_TEXT: Record<ReceiptStatus, string[]> = {
  Ready: ['Ready'],
  Draft: ['Draft'],
  Waiting: ['Waiting'],
  Done: ['done', 'Done'],
  Canceled: ['Canceled'],
}

const ACTION_TEXT: Record<ReceiptStatus, string[]> = {
  Ready: ['check_circle', 'Validate', 'visibility'],
  Draft: ['Edit', 'delete'],
  Done: ['View Details'],
  Waiting: ['Track Cargo'],
  Canceled: ['Audit Log'],
}

/** Mirrors the rendered row's innerText, which the original search matched against */
function receiptSearchText(r: Receipt): string {
  return [
    ROW_TONES[r.tone].refIcon,
    r.ref,
    'corporate_fare',
    r.supplier,
    r.supplierCode,
    r.destinationIcon,
    r.destination,
    r.zone,
    r.items,
    r.quantity,
    r.quantityNote,
    ...BADGE_TEXT[r.status],
    r.date,
    r.time,
    ...ACTION_TEXT[r.status],
  ].join('\n')
}

export interface ReceiptFilters {
  search: string
  status: StatusFilter
  warehouse: string
  supplier: string
}

export function matchesReceiptFilters(r: Receipt, filters: ReceiptFilters): boolean {
  const search = filters.search.toLowerCase().trim()
  const matchesSearch = !search || receiptSearchText(r).toLowerCase().includes(search)
  const matchesStatus = filters.status === 'ALL' || r.status === filters.status
  const matchesWh = filters.warehouse === 'ALL' || r.warehouse.includes(filters.warehouse)
  const matchesSup = filters.supplier === 'ALL' || r.supplier.includes(filters.supplier)
  return matchesSearch && matchesStatus && matchesWh && matchesSup
}

export interface SelectOption {
  value: string
  label: string
}

export const STATUS_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Waiting', label: 'Waiting' },
  { value: 'Ready', label: 'Ready' },
  { value: 'Done', label: 'Done' },
  { value: 'Canceled', label: 'Canceled' },
]

export const WAREHOUSE_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Warehouses' },
  { value: 'Main Warehouse', label: 'Main Warehouse' },
  { value: 'East Depot', label: 'East Depot' },
  { value: 'Production Floor', label: 'Production Floor' },
]

export const SUPPLIER_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Suppliers' },
  { value: 'Apex Industrial Metals', label: 'Apex Industrial' },
  { value: 'Precision Fasteners Ltd', label: 'Precision Fasteners' },
  { value: 'Global Logistics Partners', label: 'Global Logistics' },
  { value: 'TechnoCore Electronics', label: 'TechnoCore' },
  { value: 'EcoPulp Packaging', label: 'EcoPulp' },
]

export const DATE_OPTIONS: SelectOption[] = [
  { value: '30D', label: 'Last 30 Days' },
  { value: 'TODAY', label: 'Today' },
  { value: '7D', label: 'Last 7 Days' },
  { value: 'ALL', label: 'All Time' },
]

// KPI summary cards: the JS only swaps the outer class; each card's inner styling is fixed
export const KPI_CARD_ACTIVE = 'status-kpi-card bg-indigo-50/40 rounded-xl border-2 border-indigo-500/70 p-4 shadow-xs transition-all cursor-pointer relative'
export const KPI_CARD_INACTIVE = 'status-kpi-card bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group'

export interface KpiCard {
  status: ReceiptStatus
  headClass: string
  labelClass: string
  iconClass: string
  icon: string
  count: string
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
    status: 'Draft',
    iconClass: 'w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center',
    icon: 'edit_note',
    count: '3',
    unit: 'items',
    caption: 'Unvalidated drafts',
    badgeClass: 'text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 flex-shrink-0',
    badge: 'Awaiting',
  },
  {
    ...KPI_PLAIN,
    status: 'Waiting',
    iconClass: 'w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center',
    icon: 'local_shipping',
    count: '2',
    unit: 'consignments',
    caption: 'Pending dispatch',
    badgeClass: 'text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60 flex-shrink-0',
    badge: 'In Transit',
  },
  {
    status: 'Ready',
    headClass: 'flex items-center justify-between text-indigo-700',
    labelClass: 'text-[11px] font-bold uppercase tracking-wider text-indigo-900',
    iconClass: 'w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center',
    icon: 'verified',
    count: '4',
    countClass: 'text-2xl font-bold font-mono text-indigo-950',
    unit: 'to validate',
    unitClass: 'text-[11px] text-indigo-600 font-mono font-medium',
    footClass: 'mt-2 text-xs text-indigo-700 flex items-center justify-between',
    captionClass: 'truncate font-medium',
    caption: 'Staged in dock zone',
    badgeClass: 'text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 shadow-xs flex-shrink-0',
    badge: 'Validate Now',
  },
  {
    ...KPI_PLAIN,
    status: 'Done',
    iconClass: 'w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center',
    icon: 'check_circle',
    count: '28',
    unit: 'validated',
    caption: 'Atomic ledger synced',
    badgeClass: 'text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex-shrink-0',
    badge: 'Posted',
  },
  {
    ...KPI_PLAIN,
    status: 'Canceled',
    iconClass: 'w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center',
    icon: 'cancel',
    count: '1',
    unit: 'zeroed',
    caption: 'No ledger movement',
    badgeClass: 'text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 flex-shrink-0',
    badge: 'Voided',
  },
]

// The original export ships this fixed sample, not the table contents
export const RECEIPTS_CSV =
  'data:text/csv;charset=utf-8,Reference,Supplier,Warehouse,Location,Items,Quantity,Status,Date\n' +
  'WH/IN/00042,Apex Industrial Metals,Main Warehouse,Dock Zone A,3,500 KG,Ready,05 Sep 2026\n' +
  'WH/IN/00041,Precision Fasteners Ltd,East Depot,Staging Berth 02,1,1200 PCS,Draft,05 Sep 2026\n' +
  'WH/IN/00040,Global Logistics Partners,Main Warehouse,Storage Aisle 04-B,5,Multi-Unit,Done,04 Sep 2026'
