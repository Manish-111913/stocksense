import { api, downloadFile } from './client.ts'
import type { DocumentStatus, Paginated, Transfer, TransferStockChange, TransferSummary } from './types.ts'

/**
 * Internal transfer workflow (enforced by the backend):
 * DRAFT →confirm→ READY (source holds the stock now) or WAITING ; WAITING →checkAvailability→ READY
 * READY →validate→ DONE (source −, destination +, total unchanged; 409 INSUFFICIENT_STOCK if the source is short)
 * DRAFT / WAITING / READY →cancel→ CANCELED. Only DRAFT and WAITING can be edited. Source ≠ destination.
 */

export interface TransferFilters {
  search?: string
  status?: DocumentStatus
  productId?: string
  /** Source OR destination in this warehouse */
  warehouseId?: string
  sourceLocationId?: string
  destinationLocationId?: string
  dateFrom?: string
  dateTo?: string
}

export interface TransferInput {
  sourceWarehouseId: string
  sourceLocationId: string
  destinationWarehouseId: string
  destinationLocationId: string
  /** YYYY-MM-DD (defaults to today) */
  transferDate?: string
  items: { productId: string; quantity: number }[]
}

export function listTransfers(filters: TransferFilters & { page?: number; limit?: number } = {}) {
  return api<Paginated<Transfer>>('GET', '/transfers', { query: { ...filters } })
}

export function getTransferSummary() {
  return api<TransferSummary>('GET', '/transfers/summary')
}

export function getTransfer(id: string) {
  return api<Transfer>('GET', `/transfers/${id}`)
}

export function createTransfer(input: TransferInput) {
  return api<Transfer>('POST', '/transfers', { body: input })
}

export function updateTransfer(id: string, input: Partial<TransferInput>) {
  return api<Transfer>('PATCH', `/transfers/${id}`, { body: input })
}

export function confirmTransfer(id: string) {
  return api<Transfer>('POST', `/transfers/${id}/confirm`)
}

export function checkTransferAvailability(id: string) {
  return api<Transfer>('POST', `/transfers/${id}/check-availability`)
}

/** READY → DONE; returns source/destination before/after per line */
export function validateTransfer(id: string) {
  return api<Transfer & { stockChanges: TransferStockChange[] }>('POST', `/transfers/${id}/validate`)
}

export function cancelTransfer(id: string) {
  return api<Transfer>('POST', `/transfers/${id}/cancel`)
}

export function exportTransfersCsv(filters: TransferFilters) {
  return downloadFile('/transfers/export', { ...filters }, 'StockSense_Transfers.csv')
}
