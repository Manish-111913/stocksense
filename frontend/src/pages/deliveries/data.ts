export type DeliveryStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled'

export type StatusFilter = 'ALL' | DeliveryStatus

export type DeliveryView = 'list' | 'new' | 'detail'

/** Arguments of the original openValidateModal(ref, customer, qty, loc, wh) */
export interface ValidateTarget {
  ref: string
  customer: string
  quantity: string
  location: string
  warehouse: string
}

/**
 * Action cell variants:
 * - ready: the static Ready rows
 * - picked: the markup quickPickOrder() injects (slightly different classes, no title)
 */
export type RowActions =
  | { kind: 'ready'; validate: ValidateTarget; detailTitle?: string }
  | { kind: 'picked'; validate: ValidateTarget }
  | { kind: 'waiting' }
  | { kind: 'draft' }
  | { kind: 'done'; ledgerId: string }
  | { kind: 'canceled' }

export interface Delivery {
  ref: string
  /** Current lifecycle status: drives data-status, the badge and filtering */
  status: DeliveryStatus
  /** Status the row was loaded with: the reference/customer/date cells keep this styling after a pick or validation */
  tone: DeliveryStatus
  /** The Ready badge dot pulses on the first row only */
  pulse?: boolean
  customer: string
  customerNote: string
  /** data-wh value matched by the warehouse filter */
  warehouse: string
  /** data-loc value matched by the source location filter */
  location: string
  lines: string
  quantity: string
  quantityNote?: string
  date: string
  time: string
  actions: RowActions
}

export const INITIAL_DELIVERIES: Delivery[] = [
  {
    ref: 'WH/OUT/00184',
    status: 'Ready',
    tone: 'Ready',
    pulse: true,
    customer: 'Nexa Dynamics Corp',
    customerNote: 'Bangalore Tech Park · CUST-9042',
    warehouse: 'Main Warehouse West',
    location: 'Stock Bay 04-A',
    lines: '2 lines',
    quantity: '50 UNITS',
    quantityNote: '(10 PCS / 40 KG)',
    date: 'Today, 05 Sep',
    time: '14:00 IST',
    actions: {
      kind: 'ready',
      detailTitle: 'View Detailed Manifesto',
      validate: { ref: 'WH/OUT/00184', customer: 'Nexa Dynamics Corp', quantity: '50 UNITS (10 PCS chairs, 40 KG rods)', location: 'Stock Bay 04-A', warehouse: 'Main Warehouse West' },
    },
  },
  {
    ref: 'WH/OUT/00183',
    status: 'Ready',
    tone: 'Ready',
    customer: 'Apex Global Logistics',
    customerNote: 'Whitefield Terminal · CUST-1102',
    warehouse: 'East Depot',
    location: 'Staging Area East',
    lines: '4 lines',
    quantity: '320 PCS',
    date: '05 Sep 2026',
    time: '16:30 IST',
    actions: {
      kind: 'ready',
      validate: { ref: 'WH/OUT/00183', customer: 'Apex Global Logistics', quantity: '320 PCS Industrial Fasteners', location: 'Staging Area East', warehouse: 'East Depot' },
    },
  },
  {
    ref: 'WH/OUT/00182',
    status: 'Waiting',
    tone: 'Waiting',
    customer: 'TechCore Systems Pvt',
    customerNote: 'Electronic City Hub · CUST-8819',
    warehouse: 'Main Warehouse West',
    location: 'Aisle 02 / Bay 3',
    lines: '1 line',
    quantity: '15 SETS',
    date: '06 Sep 2026',
    time: 'Morning Dispatch',
    actions: { kind: 'waiting' },
  },
  {
    ref: 'WH/OUT/00181',
    status: 'Draft',
    tone: 'Draft',
    customer: 'Zenith Retail Corporation',
    customerNote: 'Koramangala DC · CUST-4410',
    warehouse: 'Central Distribution Hub',
    location: 'Dispatch Zone Alpha',
    lines: '6 lines',
    quantity: '1,100 PCS',
    date: '07 Sep 2026',
    time: 'Pending Plan',
    actions: { kind: 'draft' },
  },
  {
    ref: 'WH/OUT/00180',
    status: 'Ready',
    tone: 'Ready',
    customer: 'IndoFabricators Ltd',
    customerNote: 'Peenya Industrial Area · CUST-6501',
    warehouse: 'Main Warehouse West',
    location: 'Stock Bay 04-A',
    lines: '2 lines',
    quantity: '120 KG',
    date: '05 Sep 2026',
    time: '18:00 IST',
    actions: {
      kind: 'ready',
      validate: { ref: 'WH/OUT/00180', customer: 'IndoFabricators Ltd', quantity: '120 KG Structural Steel', location: 'Stock Bay 04-A', warehouse: 'Main Warehouse West' },
    },
  },
  {
    ref: 'WH/OUT/00179',
    status: 'Done',
    tone: 'Done',
    customer: 'Prime Logistics Hub',
    customerNote: 'Yelahanka Terminal · CUST-3091',
    warehouse: 'Main Warehouse West',
    location: 'Stock Bay 04-A',
    lines: '3 lines',
    quantity: '450 PCS',
    date: '04 Sep 2026',
    time: 'Ledger #8938',
    actions: { kind: 'done', ledgerId: 'LEDGER-8938' },
  },
  {
    ref: 'WH/OUT/00178',
    status: 'Canceled',
    tone: 'Canceled',
    customer: 'Kalyan Enterprises',
    customerNote: 'Voided Order · Customer Cancelled',
    warehouse: 'East Depot',
    location: 'Staging Area East',
    lines: '1 line',
    quantity: '0 PCS (Void)',
    date: '03 Sep 2026',
    time: 'Audit Void',
    actions: { kind: 'canceled' },
  },
]

/** Hard-coded validate arguments the quickPickOrder() markup wires to the picked row */
export function pickedValidateTarget(ref: string): ValidateTarget {
  return { ref, customer: 'TechCore Systems Pvt', quantity: '15 SETS Units', location: 'Aisle 02 / Bay 3', warehouse: 'Main Warehouse West' }
}

/** The detail view's "Validate Delivery" button is hard-wired to WH/OUT/00184 */
export const DETAIL_VALIDATE_TARGET: ValidateTarget = {
  ref: 'WH/OUT/00184',
  customer: 'Nexa Dynamics Corp',
  quantity: '50 UNITS (10 PCS chairs, 40 KG rods)',
  location: 'Stock Bay 04-A',
  warehouse: 'Main Warehouse West',
}

/** Ledger entry the validation posts (fixed in the original) */
export const VALIDATED_LEDGER_ID = 'LEDGER-8941'

export interface RowTone {
  rowClass: string
  refCellClass: string
  /** Ready rows wrap the reference in a detail link, others in a plain div */
  refLink: boolean
  refIcon: string
  refIconClass: string
  dateCellClass: string
  timeClass: string
}

const ROW_CLASS = 'hover:bg-slate-50/80 transition-colors group'
const DATE_CELL = 'py-3 px-4 text-slate-600 whitespace-nowrap'
const TIME_CLASS = 'text-[10px] text-slate-400 font-mono'

export const ROW_TONES: Record<DeliveryStatus, RowTone> = {
  Ready: {
    rowClass: ROW_CLASS,
    refCellClass: 'py-3 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap',
    refLink: true,
    refIcon: 'local_shipping',
    refIconClass: 'material-symbols-outlined text-[15px] text-indigo-500',
    dateCellClass: DATE_CELL,
    timeClass: TIME_CLASS,
  },
  Waiting: {
    rowClass: ROW_CLASS,
    refCellClass: 'py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap',
    refLink: false,
    refIcon: 'hourglass_top',
    refIconClass: 'material-symbols-outlined text-[15px] text-amber-500',
    dateCellClass: DATE_CELL,
    timeClass: TIME_CLASS,
  },
  Draft: {
    rowClass: ROW_CLASS,
    refCellClass: 'py-3 px-4 font-mono font-bold text-slate-500 whitespace-nowrap',
    refLink: false,
    refIcon: 'edit_note',
    refIconClass: 'material-symbols-outlined text-[15px] text-slate-400',
    dateCellClass: DATE_CELL,
    timeClass: TIME_CLASS,
  },
  Done: {
    rowClass: ROW_CLASS,
    refCellClass: 'py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap',
    refLink: false,
    refIcon: 'check_circle',
    refIconClass: 'material-symbols-outlined text-[15px] text-emerald-500',
    dateCellClass: DATE_CELL,
    timeClass: 'text-[10px] text-emerald-600 font-mono',
  },
  Canceled: {
    rowClass: 'hover:bg-slate-50/80 transition-colors group opacity-75',
    refCellClass: 'py-3 px-4 font-mono font-bold text-slate-400 line-through whitespace-nowrap',
    refLink: false,
    refIcon: 'cancel',
    refIconClass: 'material-symbols-outlined text-[15px] text-rose-400',
    dateCellClass: 'py-3 px-4 text-slate-400 whitespace-nowrap',
    timeClass: TIME_CLASS,
  },
}

// Text the status badge and action cell contribute to the row's innerText (icon ligatures included)
const BADGE_TEXT: Record<DeliveryStatus, string[]> = {
  Ready: ['Ready'],
  Waiting: ['Waiting'],
  Draft: ['Draft'],
  Done: ['done_all', 'Done'],
  Canceled: ['Canceled'],
}

const ACTION_TEXT: Record<RowActions['kind'], string[]> = {
  ready: ['task_alt', 'Validate', 'visibility'],
  picked: ['task_alt', 'Validate', 'visibility'],
  waiting: ['forklift', 'Pick Order', 'visibility'],
  draft: ['Edit', 'delete'],
  done: ['receipt_long', 'Ledger Post'],
  canceled: ['Audit Log'],
}

/** Mirrors the rendered row's innerText, which the original search matched against */
function deliverySearchText(d: Delivery): string {
  return [
    ROW_TONES[d.tone].refIcon,
    d.ref,
    d.customer,
    d.customerNote,
    d.warehouse,
    ...(d.tone === 'Canceled' ? [] : ['pin_drop']),
    d.location,
    d.lines,
    d.quantityNote ? `${d.quantity} ${d.quantityNote}` : d.quantity,
    ...BADGE_TEXT[d.status],
    d.date,
    d.time,
    ...ACTION_TEXT[d.actions.kind],
  ].join('\n')
}

export interface DeliveryFilters {
  search: string
  status: StatusFilter
  warehouse: string
  location: string
}

export function matchesDeliveryFilters(d: Delivery, filters: DeliveryFilters): boolean {
  const search = filters.search.toLowerCase().trim()
  const matchesSearch = !search || deliverySearchText(d).toLowerCase().includes(search)
  const matchesStatus = filters.status === 'ALL' || d.status === filters.status
  const matchesWh = filters.warehouse === 'ALL' || d.warehouse.includes(filters.warehouse)
  const matchesLoc = filters.location === 'ALL' || d.location.includes(filters.location)
  return matchesSearch && matchesStatus && matchesWh && matchesLoc
}

export interface SelectOption {
  value: string
  label: string
}

export const STATUS_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Waiting', label: 'Waiting' },
  { value: 'Ready', label: 'Ready (Picked/Packed)' },
  { value: 'Done', label: 'Done (Dispatched)' },
  { value: 'Canceled', label: 'Canceled' },
]

export const WAREHOUSE_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Warehouses' },
  { value: 'Main Warehouse West', label: 'Main Warehouse West' },
  { value: 'East Depot', label: 'East Depot' },
  { value: 'Central Distribution Hub', label: 'Central Distribution Hub' },
]

export const LOCATION_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'Source Location' },
  { value: 'Stock Bay 04-A', label: 'Stock Bay 04-A' },
  { value: 'Aisle 02 / Bay 3', label: 'Aisle 02 / Bay 3' },
  { value: 'Staging Area East', label: 'Staging Area East' },
  { value: 'Dispatch Zone Alpha', label: 'Dispatch Zone Alpha' },
]

export const DATE_OPTIONS: SelectOption[] = [
  { value: '30D', label: 'Last 30 Days' },
  { value: '7D', label: 'Last 7 Days' },
  { value: 'TODAY', label: 'Today Only' },
  { value: 'Q3', label: 'Q3 2026' },
]

// KPI summary cards: the page load runs filterByDeliveryStatus('Ready'), which swaps every card's
// outer class to one of these two; each card's inner styling stays fixed
export const KPI_CARD_ACTIVE = 'delivery-kpi-card bg-indigo-50/50 rounded-xl border-2 border-indigo-500/80 p-3.5 shadow-xs cursor-pointer transition-all flex flex-col justify-between group'
export const KPI_CARD_INACTIVE = 'delivery-kpi-card bg-white rounded-xl border border-slate-200/80 p-3.5 hover:border-slate-300 shadow-xs cursor-pointer transition-all flex flex-col justify-between group'

export interface KpiCard {
  status: DeliveryStatus
  labelClass: string
  iconClass: string
  icon: string
  count: string
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
    status: 'Draft',
    labelClass: 'text-xs font-bold uppercase tracking-wider text-slate-500',
    iconClass: 'w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:scale-110 transition-transform',
    icon: 'edit_note',
    count: '2',
    countClass: KPI_COUNT,
    unit: 'allocating',
    unitClass: 'text-xs text-slate-400 font-medium',
    footClass: KPI_FOOT,
    caption: 'Unreserved',
    badgeClass: 'font-mono font-medium text-slate-600',
    badge: '0%',
  },
  {
    status: 'Waiting',
    labelClass: 'text-xs font-bold uppercase tracking-wider text-amber-700',
    iconClass: 'w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform',
    icon: 'hourglass_top',
    count: '3',
    countClass: KPI_COUNT,
    unit: 'in picking queue',
    unitClass: 'text-xs text-amber-600 font-medium',
    footClass: KPI_FOOT,
    caption: 'Bay reservation',
    badgeClass: 'font-mono font-medium text-amber-700',
    badge: 'Stock OK',
  },
  {
    status: 'Ready',
    labelClass: 'text-xs font-bold uppercase tracking-wider text-indigo-700',
    iconClass: 'w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 group-hover:scale-110 transition-transform',
    icon: 'verified',
    count: '4',
    countClass: 'text-2xl font-bold text-indigo-900',
    unit: 'to validate',
    unitClass: 'text-xs text-indigo-600 font-semibold',
    footClass: 'mt-3 pt-2.5 border-t border-indigo-200/60 flex items-center justify-between text-xs text-indigo-800 font-medium',
    caption: 'Pick & Pack',
    badgeClass: 'px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[10px] tracking-wide uppercase',
    badge: '100% Ready',
  },
  {
    status: 'Done',
    labelClass: 'text-xs font-bold uppercase tracking-wider text-emerald-700',
    iconClass: 'w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform',
    icon: 'check_circle',
    count: '32',
    countClass: KPI_COUNT,
    unit: 'dispatched',
    unitClass: 'text-xs text-emerald-600 font-medium',
    footClass: KPI_FOOT,
    caption: 'Stock Ledger',
    badgeClass: 'font-mono font-medium text-emerald-700',
    badge: 'Committed',
  },
  {
    status: 'Canceled',
    labelClass: 'text-xs font-bold uppercase tracking-wider text-rose-700',
    iconClass: 'w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform',
    icon: 'cancel',
    count: '1',
    countClass: KPI_COUNT,
    unit: 'zeroed',
    unitClass: 'text-xs text-rose-500 font-medium',
    footClass: KPI_FOOT,
    caption: 'Stock delta',
    badgeClass: 'font-mono font-medium text-slate-400',
    badge: 'Archived',
  },
]

// The original export ships this fixed sample, not the table contents
export const DELIVERIES_CSV =
  'data:text/csv;charset=utf-8,Reference,Customer,Warehouse,SourceLocation,Lines,Quantity,Status,Date\n' +
  'WH/OUT/00184,Nexa Dynamics Corp,Main Warehouse West,Stock Bay 04-A,2,50 UNITS,Ready,05 Sep 2026\n' +
  'WH/OUT/00183,Apex Global Logistics,East Depot,Staging Area East,4,320 PCS,Ready,05 Sep 2026\n' +
  'WH/OUT/00182,TechCore Systems Pvt,Main Warehouse West,Aisle 02 / Bay 3,1,15 SETS,Waiting,06 Sep 2026\n' +
  'WH/OUT/00181,Zenith Retail Corp,Central Distribution Hub,Dispatch Zone Alpha,6,1100 PCS,Draft,07 Sep 2026\n' +
  'WH/OUT/00180,IndoFabricators Ltd,Main Warehouse West,Stock Bay 04-A,2,120 KG,Ready,05 Sep 2026\n' +
  'WH/OUT/00179,Prime Logistics Hub,Main Warehouse West,Stock Bay 04-A,3,450 PCS,Done,04 Sep 2026'

/* ---------- Create view (/deliveries/new) ---------- */

export const NEW_WAREHOUSE_OPTIONS: SelectOption[] = [
  { value: 'WH-West', label: 'Main Warehouse West (Bengaluru)' },
  { value: 'WH-East', label: 'East Depot (Whitefield)' },
  { value: 'WH-Buffer', label: 'Production Buffer Facility' },
]

/** Options updateNewSourceLocations() writes into the source location select */
export function sourceLocationOptions(warehouse: string): SelectOption[] {
  if (warehouse === 'WH-West') {
    return [
      { value: 'Bay-04-A', label: 'WH-West / Stock Bay 04-A' },
      { value: 'Aisle-02', label: 'WH-West / Aisle 02 Racks' },
      { value: 'Staging-Alpha', label: 'WH-West / Staging Buffer' },
    ]
  }
  if (warehouse === 'WH-East') {
    return [
      { value: 'Staging-East', label: 'East Depot / Staging Area East' },
      { value: 'Aisle-E1', label: 'East Depot / Bulk Aisle E-01' },
    ]
  }
  return [{ value: 'Buffer-Bay', label: 'Production Buffer / Staging Berth 01' }]
}

export type LineProductKey = 'chair' | 'steel' | 'aluminium'

export interface LineProduct {
  name: string
  category: string
  sku: string
  available: string
  unit: string
  max: number
  defaultQty: number
  inputId?: string
  inputClass: string
  /** Inline stock alert row shown by validateLineQty() while the qty exceeds `max` (static lines only) */
  alert?: { id: string; title: string; message: string }
}

const QTY_INPUT = 'w-24 text-right py-1 px-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

/** Classes validateLineQty() adds to an over-limit qty input */
export const QTY_INPUT_OVER = 'border-rose-500 bg-rose-50/40'

export const LINE_PRODUCTS: Record<LineProductKey, LineProduct> = {
  chair: {
    name: 'Ergonomic Office Chair Model V4',
    category: 'Class A Seating Furniture',
    sku: 'CHR-002',
    available: '90 PCS avail',
    unit: 'PCS',
    max: 90,
    defaultQty: 10,
    inputId: 'qtyInputChair',
    inputClass: QTY_INPUT,
    alert: {
      id: 'alertChairStock',
      title: 'Insufficient Stock Warning:',
      message: 'Requested quantity exceeds the 90 PCS available in Bay 04-A. Delivery validation will be blocked.',
    },
  },
  steel: {
    name: 'Steel Rod 20mm',
    category: 'Structural Hardened Alloy',
    sku: 'STL-001',
    available: '500 KG avail',
    unit: 'KG',
    max: 500,
    defaultQty: 40,
    inputId: 'qtyInputSteel',
    inputClass: QTY_INPUT,
    alert: {
      id: 'alertSteelStock',
      title: 'Stock Ceiling Exceeded:',
      message: 'Maximum permissible deduction is 500 KG.',
    },
  },
  // Row injected by addNewProductLine(): no id, no validation, no focus ring
  aluminium: {
    name: 'Aluminium Extrusion Bar 100mm',
    category: 'Structural Framing Profile',
    sku: 'ALU-100',
    available: '240 PCS avail',
    unit: 'PCS',
    max: 240,
    defaultQty: 20,
    inputClass: 'w-24 text-right py-1 px-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500',
  },
}

/* ---------- Detail view (/deliveries/[id]) ---------- */

export interface DetailLine {
  name: string
  note: string
  sku: string
  location: string
  picked: string
}

export const DETAIL_LINES: DetailLine[] = [
  {
    name: 'Ergonomic Office Chair Model V4',
    note: 'Class A Seating Furniture · Batch #B26-09',
    sku: 'CHR-002',
    location: 'WH-West / Bay-04-A',
    picked: '10 / 10 PCS',
  },
  {
    name: 'Steel Rod 20mm',
    note: 'Structural Hardened Alloy · Heat Lot #8801',
    sku: 'STL-001',
    location: 'WH-West / Bay-04-A',
    picked: '40 / 40 KG',
  },
]

export interface CarrierDetail {
  label: string
  value: string
  valueClass: string
}

export const CARRIER_DETAILS: CarrierDetail[] = [
  { label: 'Assigned Transporter:', value: 'BlueDart Freight Hub', valueClass: 'font-semibold text-slate-800' },
  { label: 'Vehicle Ref:', value: 'KA-01-MJ-8819', valueClass: 'font-mono font-medium text-slate-800' },
  { label: 'Driver Contact:', value: 'R. Shekawat (+91 98402 11982)', valueClass: 'font-medium text-slate-800' },
  { label: 'Security Gate Pass:', value: 'PASS-0941-VALID', valueClass: 'font-mono text-emerald-700 font-bold' },
]
