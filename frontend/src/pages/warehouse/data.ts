import { ROUTES } from '../../routes.ts'

export type NavTab = {
  label: string
  to: string
  badge?: string
}

// Sub-navigation tabs before the active Warehouse tab
export const NAV_TABS: NavTab[] = [
  { label: 'Dashboard', to: ROUTES.dashboard },
  { label: 'Products', to: ROUTES.products },
  { label: 'Receipts', to: ROUTES.receipts, badge: '12' },
  { label: 'Deliveries', to: ROUTES.deliveries, badge: '8' },
  { label: 'Transfers', to: ROUTES.transfers, badge: '24' },
  { label: 'Adjustments', to: ROUTES.adjustments, badge: '18' },
  { label: 'Move History', to: ROUTES.moveHistory },
]

export type DockItem = {
  title: string
  icon: string
  to: string
}

// Floating dock entries before the active Warehouse icon
export const DOCK_ITEMS: DockItem[] = [
  { title: 'Dashboard', icon: 'dashboard', to: ROUTES.dashboard },
  { title: 'Products', icon: 'inventory_2', to: ROUTES.products },
  { title: 'Receipts', icon: 'move_to_inbox', to: ROUTES.receipts },
  { title: 'Deliveries', icon: 'local_shipping', to: ROUTES.deliveries },
  { title: 'Transfers', icon: 'sync_alt', to: ROUTES.transfers },
  { title: 'Adjustments', icon: 'tune', to: ROUTES.adjustments },
  { title: 'Move History', icon: 'history', to: ROUTES.moveHistory },
]

export type WarehouseRow = {
  name: string
  code: string
  address: string
  icon: string
  iconBoxClassName: string
  primary?: boolean
  locationsLabel: string
  locationTags: string[]
  skus: string
  skuSummary: string
}

export const WAREHOUSES: WarehouseRow[] = [
  {
    name: 'Main Warehouse (West Hub)',
    code: 'WH-001 · Zone W1',
    address: 'Bhiwandi Logistics Corridor, MH',
    icon: 'warehouse',
    iconBoxClassName: 'w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs',
    primary: true,
    locationsLabel: '7 Active Locations',
    locationTags: ['Bay 04-A', 'Cold Bin 2', 'Dock 01'],
    skus: '94 SKUs',
    skuSummary: 'Steel Rods, Plates, Castings',
  },
  {
    name: 'East Depot Facility',
    code: 'WH-002 · Zone E2',
    address: 'Kolkata Central Hub, WB',
    icon: 'domain',
    iconBoxClassName: 'w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100',
    locationsLabel: '4 Active Locations',
    locationTags: ['Dock Bay 01', 'Bin 08-C'],
    skus: '36 SKUs',
    skuSummary: 'Fasteners, Cables, Spools',
  },
  {
    name: 'Production Plant B',
    code: 'WH-003 · Zone S4',
    address: 'Peenya Industrial Zone, Bengaluru, KA',
    icon: 'factory',
    iconBoxClassName: 'w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 border border-amber-100',
    locationsLabel: '3 Active Locations',
    locationTags: ['Rack Sector D-12', 'Assembly Bay 01'],
    skus: '18 SKUs',
    skuSummary: 'Thermal Paste, WIP Units',
  },
]

// Mirrors the row's innerText (icon ligatures included), which the original search matched against
export function warehouseSearchText(row: WarehouseRow) {
  return [
    row.icon,
    row.name,
    row.primary ? 'star' : '',
    row.code,
    row.address,
    row.locationsLabel,
    ...row.locationTags,
    row.skus,
    row.skuSummary,
    'Active',
    'Inspect',
    'edit',
  ].join('\n').toLowerCase()
}

export type HubLocation = {
  name: string
  code: string
  icon: string
  rowClassName: string
  iconBoxClassName: string
  statusClassName: string
  dotClassName: string
  status: string
  badgeClassName: string
  skus: string
}

const LOCATION_ROW = 'flex items-center justify-between pb-2.5 border-b border-slate-200/70'
const LOCATION_ROW_LAST = 'flex items-center justify-between'

// Inspector "Locations Breakdown" entries for #WH-001
export const HUB_LOCATIONS: HubLocation[] = [
  {
    name: 'Stock Bay 04-A',
    code: 'Code: LOC-W1-BAY04',
    icon: 'shelves',
    rowClassName: LOCATION_ROW,
    iconBoxClassName: 'w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5',
    statusClassName: 'text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1',
    dotClassName: 'w-1.5 h-1.5 rounded-full bg-emerald-500',
    status: 'Active · Bulk Raw Material',
    badgeClassName: 'px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-semibold text-xs shrink-0',
    skus: '42 SKUs',
  },
  {
    name: 'Dispatch Bay 01',
    code: 'Code: LOC-W1-DISP01',
    icon: 'local_shipping',
    rowClassName: LOCATION_ROW,
    iconBoxClassName: 'w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 mt-0.5',
    statusClassName: 'text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1',
    dotClassName: 'w-1.5 h-1.5 rounded-full bg-emerald-500',
    status: 'Active · Staging & Outbound',
    badgeClassName: 'px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-semibold text-xs shrink-0',
    skus: '18 SKUs',
  },
  {
    name: 'Cold Bin 2',
    code: 'Code: LOC-W1-COLD02',
    icon: 'ac_unit',
    rowClassName: LOCATION_ROW_LAST,
    iconBoxClassName: 'w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-cyan-600 shrink-0 mt-0.5',
    statusClassName: 'text-[10px] text-cyan-700 font-medium mt-0.5 flex items-center gap-1',
    dotClassName: 'w-1.5 h-1.5 rounded-full bg-cyan-500',
    status: 'Active · Temp Controlled (4°C)',
    badgeClassName: 'px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 font-mono font-semibold text-xs shrink-0',
    skus: '8 SKUs',
  },
]
