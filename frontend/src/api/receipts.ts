import { api, downloadFile } from './client.ts'
import type { DocumentStatus, Paginated, Receipt, ReceiptStockChange, ReceiptSummary, RecordStatus, Supplier } from './types.ts'

/**
 * Receipt workflow (enforced by the backend):
 * DRAFT →confirm→ WAITING →ready→ READY →validate→ DONE (stock increases + ledger)
 * DRAFT / WAITING / READY →cancel→ CANCELED. Only DRAFT and WAITING can be edited.
 */

export interface ReceiptFilters {
  search?: string
  status?: DocumentStatus
  supplierId?: string
  warehouseId?: string
  locationId?: string
  /** YYYY-MM-DD */
  dateFrom?: string
  dateTo?: string
}

export interface ReceiptInput {
  supplierId: string
  warehouseId: string
  /** Must belong to the warehouse */
  locationId: string
  /** YYYY-MM-DD (defaults to today) */
  receiptDate?: string
  /** One line per product, quantity > 0 */
  items: { productId: string; quantity: number }[]
}

export function listReceipts(filters: ReceiptFilters & { page?: number; limit?: number } = {}) {
  return api<Paginated<Receipt>>('GET', '/receipts', { query: { ...filters } })
}

export function getReceiptSummary() {
  return api<ReceiptSummary>('GET', '/receipts/summary')
}

export function getReceipt(id: string) {
  return api<Receipt>('GET', `/receipts/${id}`)
}

export function createReceipt(input: ReceiptInput) {
  return api<Receipt>('POST', '/receipts', { body: input })
}

/** DRAFT / WAITING only (409 otherwise); `items` replaces all lines */
export function updateReceipt(id: string, input: Partial<ReceiptInput>) {
  return api<Receipt>('PATCH', `/receipts/${id}`, { body: input })
}

export function confirmReceipt(id: string) {
  return api<Receipt>('POST', `/receipts/${id}/confirm`)
}

export function markReceiptReady(id: string) {
  return api<Receipt>('POST', `/receipts/${id}/ready`)
}

/** READY → DONE; returns the stock before/after per line */
export function validateReceipt(id: string) {
  return api<Receipt & { stockChanges: ReceiptStockChange[] }>('POST', `/receipts/${id}/validate`)
}

export function cancelReceipt(id: string) {
  return api<Receipt>('POST', `/receipts/${id}/cancel`)
}

export function exportReceiptsCsv(filters: ReceiptFilters) {
  return downloadFile('/receipts/export', { ...filters }, 'StockSense_Receipts.csv')
}

export function listSuppliers(filters: { search?: string; status?: RecordStatus } = {}) {
  return api<Supplier[]>('GET', '/suppliers', { query: { ...filters } })
}

/** Code is optional and uppercased; 409 on duplicate code */
export function createSupplier(input: { name: string; code?: string; email?: string; phone?: string }) {
  return api<Supplier>('POST', '/suppliers', { body: input })
}

export function updateSupplier(id: string, input: { name?: string; code?: string; email?: string; phone?: string }) {
  return api<Supplier>('PATCH', `/suppliers/${id}`, { body: input })
}

/** Inventory managers only */
export function setSupplierStatus(id: string, status: RecordStatus) {
  return api<Supplier>('PATCH', `/suppliers/${id}/status`, { body: { status } })
}
