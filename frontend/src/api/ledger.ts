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
  /** The receipt / delivery / transfer / adjustment id */
  referenceId?: string
  /** YYYY-MM-DD, inclusive */
  dateFrom?: string
  /** YYYY-MM-DD, inclusive */
  dateTo?: string
}

export function listLedger(filters: LedgerFilters & { page?: number; limit?: number } = {}) {
  return api<Paginated<LedgerEntry>>('GET', '/ledger', { query: { ...filters } })
}

export function getLedgerSummary(filters: LedgerFilters = {}) {
  return api<LedgerSummary>('GET', '/ledger/summary', { query: { ...filters } })
}

export function exportLedgerCsv(filters: LedgerFilters = {}) {
  return downloadFile('/ledger/export', { ...filters }, 'StockSense_Stock_Ledger.csv')
}
