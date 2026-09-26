import { ROUTES } from '../../routes.ts'

export interface NavLink {
  label: string
  to?: string
  badge?: string
  active?: boolean
}

// Pinned sub-navigation tab bar (Directory has no module, keeps the original no-op)
export const NAV_LINKS: NavLink[] = [
  { label: 'Dashboard', to: ROUTES.dashboard },
  { label: 'Products', to: ROUTES.products },
  { label: 'Receipts', to: ROUTES.receipts, badge: '12' },
  { label: 'Deliveries', to: ROUTES.deliveries, badge: '8' },
  { label: 'Transfers', to: ROUTES.transfers, badge: '24' },
  { label: 'Adjustments', to: ROUTES.adjustments, badge: '18' },
  { label: 'Move History', to: ROUTES.moveHistory, active: true },
  { label: 'Warehouse', to: ROUTES.warehouse },
  { label: 'Directory' },
]

export interface DockItem {
  title: string
  icon: string
  to: string
  active?: boolean
}

export const DOCK_ITEMS: DockItem[] = [
  { title: 'Dashboard', icon: 'dashboard', to: ROUTES.dashboard },
  { title: 'Products', icon: 'inventory_2', to: ROUTES.products },
  { title: 'Receipts', icon: 'move_to_inbox', to: ROUTES.receipts },
  { title: 'Deliveries', icon: 'local_shipping', to: ROUTES.deliveries },
  { title: 'Transfers', icon: 'sync_alt', to: ROUTES.transfers },
  { title: 'Adjustments', icon: 'tune', to: ROUTES.adjustments },
  { title: 'Move History', icon: 'history', to: ROUTES.moveHistory, active: true },
  { title: 'Warehouse', icon: 'warehouse', to: ROUTES.warehouse },
]

export const FILTER_PILLS = ['Type: All Movements', 'Warehouse: All Warehouses', 'Timeframe: Last 30 Days']

export type MovementType = 'transfer' | 'receipt' | 'delivery' | 'adjustment'

export const MOVEMENT_BADGES: Record<MovementType, { className: string; icon: string; label: string }> = {
  transfer: {
    className: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100',
    icon: 'sync_alt',
    label: 'Internal Transfer',
  },
  receipt: {
    className: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-100',
    icon: 'move_to_inbox',
    label: 'Receipt',
  },
  delivery: {
    className: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 font-semibold text-[11px] border border-rose-100',
    icon: 'local_shipping',
    label: 'Delivery',
  },
  adjustment: {
    className: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-semibold text-[11px] border border-amber-200',
    icon: 'tune',
    label: 'Inventory Adjustment',
  },
}

export interface FlowPoint {
  className: string
  label: string
  sub?: { className: string; label: string }
}

export type FlowPath =
  | { kind: 'route'; from: FlowPoint; arrowClassName: string; to: FlowPoint }
  | { kind: 'adjustment'; location: string; bay: string; detail: string }

export interface LedgerRecord {
  timestamp: string
  txHash: string
  reference: string
  referenceMeta: string
  type: MovementType
  product: string
  sku: string
  category: string
  quantity: string
  quantityClassName: string
  quantityNote: string
  quantityNoteClassName: string
  flow: FlowPath
  flowNote: string
  flowNoteClassName: string
  // The highlighted row opens the inspector drawer on click
  highlighted?: boolean
}

const QTY_INDIGO = 'inline-flex items-center px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-semibold text-xs'
const QTY_EMERALD = 'inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-semibold text-xs'
const QTY_ROSE = 'inline-flex items-center px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono font-semibold text-xs'
const QTY_NOTE_SLATE = 'text-[10px] font-mono text-slate-400 mt-0.5'
const QTY_NOTE_EMERALD = 'text-[10px] font-mono text-emerald-600 mt-0.5'
const ARROW_INDIGO = 'material-symbols-outlined text-[13px] text-indigo-600'
const ARROW_SLATE = 'material-symbols-outlined text-[13px] text-slate-400'
const FLOW_NOTE_SLATE = 'text-[11px] text-slate-400 mt-0.5'
const FLOW_NOTE_ROSE = 'text-[11px] text-rose-600 mt-0.5'
const POINT_DARK = 'font-medium text-slate-800'
const POINT_MUTED = 'font-medium text-slate-500'
const SUB_SLATE = 'text-slate-400 font-normal'

export const LEDGER_ROWS: LedgerRecord[] = [
  {
    timestamp: '05 Sep 2026, 14:15 IST',
    txHash: '0x7f9a...17a2',
    reference: 'WH/INT/00142',
    referenceMeta: 'Batch #B-8839',
    type: 'transfer',
    product: 'Steel Rod 20mm',
    sku: 'STL-001',
    category: 'Raw Metals',
    quantity: '150.00 KG (Transfer)',
    quantityClassName: QTY_INDIGO,
    quantityNote: 'Net Delta: 0.00',
    quantityNoteClassName: QTY_NOTE_SLATE,
    flow: {
      kind: 'route',
      from: { className: POINT_DARK, label: 'Main Warehouse (West)', sub: { className: SUB_SLATE, label: 'Bay 04-A' } },
      arrowClassName: ARROW_INDIGO,
      to: { className: 'font-medium text-indigo-700', label: 'East Depot', sub: { className: 'text-indigo-400 font-normal', label: 'Dock 01' } },
    },
    flowNote: 'Internal reallocation order',
    flowNoteClassName: FLOW_NOTE_SLATE,
    highlighted: true,
  },
  {
    timestamp: '05 Sep 2026, 11:32 IST',
    txHash: '0x4b12...99f0',
    reference: 'REC-2026-0042',
    referenceMeta: 'PO-99120 · Inbound',
    type: 'receipt',
    product: 'Thermal Interface Paste',
    sku: 'THM-050',
    category: 'Chemicals',
    quantity: '+500.00 KG',
    quantityClassName: QTY_EMERALD,
    quantityNote: 'Supplier Intake',
    quantityNoteClassName: QTY_NOTE_EMERALD,
    flow: {
      kind: 'route',
      from: { className: POINT_MUTED, label: 'Apex Metals (Supplier)' },
      arrowClassName: ARROW_SLATE,
      to: { className: POINT_DARK, label: 'Main Warehouse (West)', sub: { className: SUB_SLATE, label: 'Bay 04-A' } },
    },
    flowNote: 'GRN Verified by Quality Gate',
    flowNoteClassName: FLOW_NOTE_SLATE,
  },
  {
    timestamp: '04 Sep 2026, 17:40 IST',
    txHash: '0x93de...411c',
    reference: 'DEL-2026-0081',
    referenceMeta: 'SO-44019 · Dispatched',
    type: 'delivery',
    product: 'Ergonomic Office Chair',
    sku: 'CHR-002',
    category: 'Finished Goods',
    quantity: '-10.00 UNITS',
    quantityClassName: QTY_ROSE,
    quantityNote: 'Dispatched Out',
    quantityNoteClassName: QTY_NOTE_SLATE,
    flow: {
      kind: 'route',
      from: { className: POINT_DARK, label: 'Main Warehouse (West)', sub: { className: SUB_SLATE, label: 'Bay 02' } },
      arrowClassName: ARROW_SLATE,
      to: { className: POINT_MUTED, label: 'Zenith Retail (Customer)' },
    },
    flowNote: 'Airway Bill: BLR-DL-88914',
    flowNoteClassName: FLOW_NOTE_SLATE,
  },
  {
    timestamp: '04 Sep 2026, 09:20 IST',
    txHash: '0x33aa...8821',
    reference: 'ADJ-2026-0089',
    referenceMeta: 'Physical Cycle Count',
    type: 'adjustment',
    product: 'Steel Rod 20mm',
    sku: 'STL-001',
    category: 'Raw Metals',
    quantity: '-3.00 KG (Adjustment)',
    quantityClassName: QTY_ROSE,
    quantityNote: 'Scrap / Wear variance',
    quantityNoteClassName: QTY_NOTE_SLATE,
    flow: {
      kind: 'adjustment',
      location: 'Main Warehouse',
      bay: 'Bay 04-A',
      detail: 'Recorded: 100.00 kg → Physical: 97.00 kg',
    },
    flowNote: 'Reconciliation approved by Auditor',
    flowNoteClassName: FLOW_NOTE_ROSE,
  },
  {
    timestamp: '03 Sep 2026, 16:05 IST',
    txHash: '0x88cc...322b',
    reference: 'REC-2026-0041',
    referenceMeta: 'PO-99115 · Intake',
    type: 'receipt',
    product: 'Aluminum Casing 15-inch',
    sku: 'CAS-015',
    category: 'Hardware',
    quantity: '+120.00 UNITS',
    quantityClassName: QTY_EMERALD,
    quantityNote: 'Supplier Intake',
    quantityNoteClassName: QTY_NOTE_EMERALD,
    flow: {
      kind: 'route',
      from: { className: POINT_MUTED, label: 'Precision Parts Co.' },
      arrowClassName: ARROW_SLATE,
      to: { className: POINT_DARK, label: 'North Facility', sub: { className: SUB_SLATE, label: 'Rack B-12' } },
    },
    flowNote: 'Direct vendor container delivery',
    flowNoteClassName: FLOW_NOTE_SLATE,
  },
]
