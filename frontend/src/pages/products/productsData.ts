import { useSyncExternalStore } from 'react'

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'

/** Colour of the stock breakdown button and the reorder "Min" label */
export type StockTone = 'normal' | 'low' | 'out'

/** Second entry of the row action menu (after View Details) */
export type RowAction = 'quickEdit' | 'createPo' | 'expedite'

export interface HubStock {
  name: string
  qty: string
}

export interface ProductRow {
  /** Id of the row action menu, also used as the React key */
  menuId: string
  sku: string
  name: string
  description: string
  icon: string
  category: string
  uom: string
  stockLabel: string
  hubsLabel: string
  stockTone: StockTone
  hubs: HubStock[]
  status: StockStatus
  minLabel: string
  ruleNote: string
  /** Colour classes of the reorder rule note, appended to 'block text-[10px]' */
  ruleNoteClass: string
  action: RowAction
  /** Rows created from /products/new get an indigo tint */
  isNew?: boolean
}

export interface NewProductInput {
  name: string
  sku: string
  category: string
  uom: string
  stock: number
  reorder: string
}

/** Catalog size shown in the KPI card before any product is created */
const BASE_ACTIVE_SKUS = 148

const SEED_PRODUCTS: ProductRow[] = [
  {
    menuId: 'menu-row-1',
    sku: 'STL-001',
    name: 'Steel Rod 20mm',
    description: 'Industrial Grade A-36 · High Tensile',
    icon: 'precision_manufacturing',
    category: 'Raw Materials',
    uom: 'KG',
    stockLabel: '500 KG',
    hubsLabel: '2 Hubs ▾',
    stockTone: 'normal',
    hubs: [
      { name: 'Main Warehouse', qty: '350 KG' },
      { name: 'West Facility', qty: '150 KG' },
    ],
    status: 'In Stock',
    minLabel: 'Min: 50 KG',
    ruleNote: 'Batch: 200 KG',
    ruleNoteClass: 'text-slate-400',
    action: 'quickEdit',
  },
  {
    menuId: 'menu-row-2',
    sku: 'CHR-002',
    name: 'Ergonomic Office Chair',
    description: 'Model V4 · Mesh Lumbar Support',
    icon: 'chair',
    category: 'Finished Goods',
    uom: 'PCS',
    stockLabel: '90 PCS',
    hubsLabel: '2 Hubs ▾',
    stockTone: 'normal',
    hubs: [
      { name: 'Main Warehouse', qty: '60 PCS' },
      { name: 'East Depot', qty: '30 PCS' },
    ],
    status: 'In Stock',
    minLabel: 'Min: 15 PCS',
    ruleNote: 'Auto-PO enabled',
    ruleNoteClass: 'text-slate-400',
    action: 'quickEdit',
  },
  {
    menuId: 'menu-row-3',
    sku: 'PDU-880',
    name: 'Rackmount PDU 16A',
    description: '0U Vertical · 24-Port C13 Metered',
    icon: 'power',
    category: 'Electronics',
    uom: 'UNITS',
    stockLabel: '3 units',
    hubsLabel: '1 Hub ▾',
    stockTone: 'low',
    hubs: [{ name: 'Main Warehouse', qty: '3 units' }],
    status: 'Low Stock',
    minLabel: 'Min: 10 units',
    ruleNote: 'Reorder trigger hit',
    ruleNoteClass: 'text-amber-600 font-medium',
    action: 'createPo',
  },
  {
    menuId: 'menu-row-4',
    sku: 'CBL-CAT6',
    name: 'Cat6 UTP Cable Spool',
    description: '305m High Speed Solid Copper',
    icon: 'cable',
    category: 'Hardware',
    uom: 'BOX',
    stockLabel: '2 spools',
    hubsLabel: '1 Hub ▾',
    stockTone: 'low',
    hubs: [{ name: 'West Facility', qty: '2 spools' }],
    status: 'Low Stock',
    minLabel: 'Min: 5 spools',
    ruleNote: 'Suggested: 20',
    ruleNoteClass: 'text-slate-400',
    action: 'quickEdit',
  },
  {
    menuId: 'menu-row-5',
    sku: 'THM-050',
    name: 'Thermal Interface Paste',
    description: '50g Syringe · 8.5 W/mK Conductive',
    icon: 'thermostat',
    category: 'Consumables',
    uom: 'PCS',
    stockLabel: '0 units',
    hubsLabel: '0 in stock ▾',
    stockTone: 'out',
    hubs: [
      { name: 'Main Warehouse', qty: '0 units' },
      { name: 'East Depot', qty: '0 units' },
    ],
    status: 'Out of Stock',
    minLabel: 'Min: 25 units',
    ruleNote: 'Critical Shortage',
    ruleNoteClass: 'text-rose-600 font-semibold',
    action: 'expedite',
  },
  {
    menuId: 'menu-row-6',
    sku: 'BRG-6204',
    name: 'Ball Bearing 6204-2RS',
    description: 'Deep Groove Rubber Sealed C3',
    icon: 'settings',
    category: 'Hardware',
    uom: 'PCS',
    stockLabel: '1,240 PCS',
    hubsLabel: '2 Hubs ▾',
    stockTone: 'normal',
    hubs: [
      { name: 'Main Warehouse', qty: '800 PCS' },
      { name: 'East Depot', qty: '440 PCS' },
    ],
    status: 'In Stock',
    minLabel: 'Min: 200 PCS',
    ruleNote: 'Stock Surplus +24%',
    ruleNoteClass: 'text-emerald-600 font-medium',
    action: 'quickEdit',
  },
  {
    menuId: 'menu-row-7',
    sku: 'ALU-PLT-10',
    name: 'Aluminium Plate 10mm',
    description: 'Grade 6061-T6 Precision Milled',
    icon: 'square',
    category: 'Raw Materials',
    uom: 'PCS',
    stockLabel: '320 PCS',
    hubsLabel: '3 Hubs ▾',
    stockTone: 'normal',
    hubs: [
      { name: 'Main Warehouse', qty: '180 PCS' },
      { name: 'West Facility', qty: '80 PCS' },
      { name: 'East Depot', qty: '60 PCS' },
    ],
    status: 'In Stock',
    minLabel: 'Min: 50 PCS',
    ruleNote: 'Lead Time: 4 days',
    ruleNoteClass: 'text-slate-400',
    action: 'quickEdit',
  },
]

// Tiny module-level store so a product created on /products/new shows up on /products
let products: ProductRow[] = SEED_PRODUCTS
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return products
}

export function useProducts(): ProductRow[] {
  return useSyncExternalStore(subscribe, getSnapshot)
}

/** "Total Active SKUs" KPI: 148 plus every product created in this session */
export function useActiveSkuCount(): number {
  const rows = useProducts()
  return BASE_ACTIVE_SKUS + rows.filter((row) => row.isNew).length
}

function newMenuId(): string {
  let id: string
  do {
    id = 'menu-row-new-' + Math.floor(Math.random() * 1000)
  } while (products.some((row) => row.menuId === id))
  return id
}

/** Inserts a created product at the top of the directory table (insertProductIntoTable) */
export function addProduct(prod: NewProductInput) {
  let status: StockStatus
  if (prod.stock === 0) {
    status = 'Out of Stock'
  } else if (prod.stock <= parseInt(prod.reorder)) {
    status = 'Low Stock'
  } else {
    status = 'In Stock'
  }

  const row: ProductRow = {
    menuId: newMenuId(),
    sku: prod.sku,
    name: prod.name,
    description: 'Newly Created Product',
    icon: 'inventory_2',
    category: prod.category,
    uom: prod.uom,
    stockLabel: `${prod.stock} ${prod.uom}`,
    hubsLabel: '1 Hub ▾',
    stockTone: 'normal',
    hubs: [{ name: 'Main Warehouse', qty: `${prod.stock} ${prod.uom}` }],
    status,
    minLabel: `Min: ${prod.reorder} ${prod.uom}`,
    ruleNote: 'Creation Opening',
    ruleNoteClass: 'text-slate-400',
    action: 'quickEdit',
    isNew: true,
  }

  products = [row, ...products]
  listeners.forEach((listener) => listener())
}

/** Approximates the row's innerText, which the original filters matched against */
export function productSearchText(row: ProductRow): string {
  return [row.icon, row.name, row.description, row.sku, row.category, row.uom, row.stockLabel, row.hubsLabel, row.status, row.minLabel, row.ruleNote, 'more_horiz']
    .join('\t')
    .toLowerCase()
}

const SKU_PREFIXES = ['RAW', 'ELC', 'STL', 'CMP', 'FNT', 'CAB']

export function generateSku(): string {
  const prefix = SKU_PREFIXES[Math.floor(Math.random() * SKU_PREFIXES.length)]
  const num = Math.floor(100 + Math.random() * 900)
  return `${prefix}-${num}`
}

export function exportProductsCSV() {
  const dummyCSV =
    'data:text/csv;charset=utf-8,SKU,Name,Category,UOM,Total Stock,Status\nSTL-001,Steel Rod 20mm,Raw Materials,KG,500,In Stock\nCHR-002,Ergonomic Office Chair,Finished Goods,PCS,90,In Stock\nPDU-880,Rackmount PDU 16A,Electronics,UNITS,3,Low Stock\nCBL-CAT6,Cat6 UTP Cable Spool,Hardware,BOX,2,Low Stock\nTHM-050,Thermal Interface Paste,Consumables,PCS,0,Out of Stock'
  const encodedUri = encodeURI(dummyCSV)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', 'StockSense_Products_Catalog.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
