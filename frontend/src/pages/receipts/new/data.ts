// Mock data for the New Receipt screen (WH/IN/00001)

export const RECEIPT_REF = 'WH/IN/00001'

export type ReceiptWorkflowState = 'draft' | 'done'

export interface CatalogProduct {
  sku: string
  name: string
  unit: string
  description: string
}

/** Products offered by the "+ Add Product from Catalog" quick-add select */
export const CATALOG: CatalogProduct[] = [
  { sku: 'STL-001', name: 'Steel Rod 20mm', unit: 'KG', description: 'Industrial Grade A-36 · High Tensile' },
  { sku: 'CHR-002', name: 'Ergonomic Office Chair', unit: 'PCS', description: 'Model V4 · Mesh Lumbar Support' },
  { sku: 'PDU-880', name: 'Rackmount PDU 16A', unit: 'UNITS', description: '0U Vertical · 24-Port C13 Metered' },
  { sku: 'ALM-102', name: 'Aluminum Ingot Grade 1', unit: 'KG', description: 'Primary Aluminium · 99.7% Purity' },
]

/** Quick-add option value, as in the original markup: "SKU|Name|Unit" */
export const catalogOptionValue = (product: CatalogProduct) => `${product.sku}|${product.name}|${product.unit}`

export interface ReceiptLine {
  sku: string
  name: string
  description: string
  unit: string
  /** Raw input value, so the field can be cleared while typing */
  qty: string
}

export const INITIAL_LINES: ReceiptLine[] = [
  { sku: 'STL-001', name: 'Steel Rod 20mm', description: 'Industrial Grade A-36 · High Tensile', unit: 'KG', qty: '200' },
  { sku: 'CHR-002', name: 'Ergonomic Office Chair', description: 'Model V4 · Mesh Lumbar Support', unit: 'PCS', qty: '50' },
]

export interface SelectOption {
  value: string
  label: string
}

export interface Warehouse extends SelectOption {
  locations: SelectOption[]
}

export const WAREHOUSES: Warehouse[] = [
  {
    value: 'WH-MAIN',
    label: 'Main Warehouse (West Hub)',
    locations: [
      { value: 'LOC-IN-01', label: 'WH/Stock/Inbound Dock A' },
      { value: 'LOC-IN-02', label: 'WH/Stock/Rack B-04 · Shelf 2' },
      { value: 'LOC-IN-03', label: 'WH/Stock/Staging Bay 1' },
    ],
  },
  {
    value: 'WH-EAST',
    label: 'East Depot (Logistics Center)',
    locations: [
      { value: 'LOC-EA-01', label: 'EAST/Stock/Inbound Bay 2' },
      { value: 'LOC-EA-02', label: 'EAST/Stock/Zone C · Pallet P-11' },
    ],
  },
  {
    value: 'WH-PROD',
    label: 'Production Floor Buffer',
    locations: [{ value: 'LOC-PR-01', label: 'PROD/Buffer/Sub-assembly Bay' }],
  },
]

export const SUPPLIERS = ['Apex Industrial Metals Ltd.', 'Global Matrix Tech Components', 'OmniCraft Logistics Supplies', 'Precision Hardware Forge']

/** Received quantity of a line, or null when it is not strictly positive */
export function parseQty(qty: string): number | null {
  const value = Number(qty)
  return qty.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null
}

export const plural = (count: number, singular: string, pluralForm = `${singular}s`) => (count === 1 ? singular : pluralForm)
