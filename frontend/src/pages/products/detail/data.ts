// Mock data for the Product Detail screen (the original page shows STL-001)

export type DetailMode = 'view' | 'edit' | 'skeleton' | 'notfound'

export const MODE_BUTTONS: { mode: DetailMode; id: string; icon: string; label: string }[] = [
  { mode: 'view', id: 'btnModeView', icon: 'visibility', label: 'View Mode' },
  { mode: 'edit', id: 'btnModeEdit', icon: 'edit', label: 'Edit Mode' },
  { mode: 'skeleton', id: 'btnModeSkeleton', icon: 'hourglass_empty', label: 'Loading Skeleton' },
  { mode: 'notfound', id: 'btnModeNotFound', icon: 'error_outline', label: 'Product Not Found' },
]

/** Values shown by the read-only panel (the original rewrote these nodes after a save) */
export interface ProductDisplay {
  name: string
  sku: string
  category: string
  uom: string
  reorder: string
}

/** Values of the edit form inputs */
export interface ProductForm {
  name: string
  sku: string
  category: string
  uom: string
  reorder: string
}

export const initialDisplay = (sku: string): ProductDisplay => ({
  name: 'Steel Rod 20mm',
  sku,
  category: 'Raw Materials',
  uom: 'KG (Kilograms)',
  reorder: '50 KG',
})

export const initialForm = (sku: string): ProductForm => ({
  name: 'Steel Rod 20mm',
  sku,
  category: 'Raw Materials',
  uom: 'KG',
  reorder: '50',
})

export const CATEGORY_OPTIONS = ['Raw Materials', 'Finished Goods', 'Electronics', 'Hardware', 'Consumables']

export const UOM_OPTIONS: { value: string; label: string }[] = [
  { value: 'KG', label: 'KG (Kilograms)' },
  { value: 'PCS', label: 'PCS (Pieces)' },
  { value: 'L', label: 'L (Litres)' },
  { value: 'M', label: 'M (Meters)' },
  { value: 'BOX', label: 'BOX (Boxes)' },
]

export interface LocationRow {
  name: string
  detail: string
  qty: string
  status: string
  icon: string
  tone: 'healthy' | 'reorder'
}

export const LOCATION_ROWS: LocationRow[] = [
  { name: 'Main Warehouse (West Hub)', detail: 'Rack B-04 · Shelf 2', qty: '350 KG', status: 'Healthy', icon: 'warehouse', tone: 'healthy' },
  { name: 'East Depot (Logistics Center)', detail: 'Zone C · Pallet P-11', qty: '100 KG', status: 'In Stock', icon: 'warehouse', tone: 'healthy' },
  { name: 'Production Floor Buffer', detail: 'Sub-assembly bay', qty: '50 KG', status: 'At Reorder Level', icon: 'precision_manufacturing', tone: 'reorder' },
]

export const LOCATION_TONES: Record<LocationRow['tone'], { row: string; icon: string; detail: string; qty: string; status: string; dot: string }> = {
  healthy: {
    row: 'p-3 flex items-center justify-between hover:bg-slate-50 transition-colors',
    icon: 'material-symbols-outlined text-[15px] text-slate-400',
    detail: 'text-[10px] text-slate-400',
    qty: 'font-mono font-bold text-slate-900',
    status: 'inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium',
    dot: 'w-1 h-1 rounded-full bg-emerald-500',
  },
  reorder: {
    row: 'p-3 flex items-center justify-between bg-amber-50/30 hover:bg-amber-50/60 transition-colors',
    icon: 'material-symbols-outlined text-[15px] text-amber-600',
    detail: 'text-[10px] text-amber-700',
    qty: 'font-mono font-bold text-amber-900',
    status: 'inline-flex items-center gap-1 text-[10px] text-amber-700 font-semibold',
    dot: 'w-1 h-1 rounded-full bg-amber-500',
  },
}

export interface LedgerRow {
  timestamp: string
  type: string
  reference: string
  icon: string
  /** Colour classes of the icon tile */
  iconTone: string
  qty: string
  /** Weight + colour classes of the quantity cell */
  qtyTone: string
  route: string
  status: string
  /** Colour classes of the status pill */
  statusTone: string
  performedBy: string
}

const COMPLETED_TONE = 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'

export const LEDGER_ROWS: LedgerRow[] = [
  {
    timestamp: '05 Sep 2026, 11:20',
    type: 'Receipt',
    reference: 'PO-2026-992',
    icon: 'call_received',
    iconTone: 'bg-emerald-50 text-emerald-600',
    qty: '+200 KG',
    qtyTone: 'font-bold text-emerald-600',
    route: 'Supplier Dock → Main Warehouse',
    status: 'Completed',
    statusTone: COMPLETED_TONE,
    performedBy: 'Admin',
  },
  {
    timestamp: '04 Sep 2026, 15:45',
    type: 'Delivery',
    reference: 'DO-2026-1082',
    icon: 'local_shipping',
    iconTone: 'bg-blue-50 text-blue-600',
    qty: '-80 KG',
    qtyTone: 'font-bold text-rose-600',
    route: 'Main Warehouse → Customer Dispatch',
    status: 'Completed',
    statusTone: COMPLETED_TONE,
    performedBy: 'Logistics',
  },
  {
    timestamp: '02 Sep 2026, 09:30',
    type: 'Internal Transfer',
    reference: 'TR-402',
    icon: 'sync_alt',
    iconTone: 'bg-indigo-50 text-indigo-600',
    qty: '50 KG',
    qtyTone: 'font-semibold text-slate-800',
    route: 'Main Warehouse → Production Floor',
    status: 'Completed',
    statusTone: COMPLETED_TONE,
    performedBy: 'Operations',
  },
  {
    timestamp: '28 Aug 2026, 17:10',
    type: 'Inventory Adjustment',
    reference: 'ADJ-089',
    icon: 'tune',
    iconTone: 'bg-amber-50 text-amber-600',
    qty: '-12 KG',
    qtyTone: 'font-bold text-rose-600',
    route: 'Main Warehouse (Damaged during transit)',
    status: 'Reconciled',
    statusTone: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
    performedBy: 'Supervisor',
  },
]

export interface MovementAction {
  label: string
  icon: string
  /** Colour classes of the icon tile */
  iconTone: string
  /** Icon tile shade on button hover */
  hoverTone: string
  /** Receipts has a screen; the other modules show the module toast */
  module?: string
}

export const MOVEMENT_ACTIONS: MovementAction[] = [
  { label: 'Receive Stock', icon: 'arrow_downward', iconTone: 'bg-emerald-50 text-emerald-600', hoverTone: 'group-hover:bg-emerald-100' },
  { label: 'Deliver Stock', icon: 'arrow_upward', iconTone: 'bg-blue-50 text-blue-600', hoverTone: 'group-hover:bg-blue-100', module: 'Deliveries' },
  { label: 'Transfer Stock', icon: 'sync_alt', iconTone: 'bg-indigo-50 text-indigo-600', hoverTone: 'group-hover:bg-indigo-100', module: 'Transfers' },
  { label: 'Adjust Stock', icon: 'tune', iconTone: 'bg-amber-50 text-amber-600', hoverTone: 'group-hover:bg-amber-100', module: 'Adjustments' },
]
