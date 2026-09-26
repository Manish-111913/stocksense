import { api, downloadFile } from './client.ts'
import type { LedgerDirection, LedgerEntry, LedgerSummary, MovementType, Paginated } from './types.ts'

// Read-only: ledger rows are append-only and only written by validated / applied documents

export interface LedgerFilters {
  /** Product name, SKU or document reference */
  search?: string
  productId?: string
  warehouseId?: string
  locationId?: string
  movementType?: MovementType
  direction?: LedgerDirection
  referenceType?: MovementType
  /** The receipt / delivery / transfer / adjustment id */
  referenceId?: string
  /** User id */
  performedBy?: string
  /** Inclusive: YYYY-MM-DD (a whole UTC day) or a full ISO date-time (e.g. local midnight via toISOString) */
  dateFrom?: string
  /** Inclusive, same format as dateFrom */
  dateTo?: string
}

export function listLedger(filters: LedgerFilters & { page?: number; limit?: number; sortOrder?: 'asc' | 'desc' } = {}) {
  return api<Paginated<LedgerEntry>>('GET', '/ledger', { query: { ...filters } })
}

export function getLedgerEntry(id: string) {
  return api<LedgerEntry>('GET', `/ledger/${id}`)
}

export function getLedgerSummary(filters: LedgerFilters = {}) {
  return api<LedgerSummary>('GET', '/ledger/summary', { query: { ...filters } })
}

export function exportLedgerCsv(filters: LedgerFilters = {}) {
  return downloadFile('/ledger/export', { ...filters }, 'StockSense_Stock_Ledger.csv')
}
