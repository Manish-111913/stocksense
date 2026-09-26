import { api, downloadFile } from './client.ts'
import type { Adjustment, AdjustmentSummary, DocumentStatus, Paginated } from './types.ts'

/**
 * Adjustment workflow (enforced by the backend):
 * create READY (backend reads the recorded quantity + stock version) →apply→ DONE (stock := physical count + ledger)
 * READY →cancel→ CANCELED. Apply is INVENTORY_MANAGER only (403 otherwise).
 * Apply fails with 409 STOCK_CHANGED_SINCE_ADJUSTMENT if stock moved after the count was recorded;
 * `recountAdjustment` stores a NEW physical count and re-reads the recorded quantity (clears staleness).
 */

export interface AdjustmentFilters {
  search?: string
  status?: DocumentStatus
  productId?: string
  warehouseId?: string
  locationId?: string
  dateFrom?: string
  dateTo?: string
}

export interface AdjustmentInput {
  productId: string
  warehouseId: string
  /** Must belong to the warehouse */
  locationId: string
  /** Counted quantity (≥ 0) */
  physicalQuantity: number
  reason: string
  notes?: string
}

export function listAdjustments(filters: AdjustmentFilters & { page?: number; limit?: number } = {}) {
  return api<Paginated<Adjustment>>('GET', '/adjustments', { query: { ...filters } })
}

export function getAdjustmentSummary() {
  return api<AdjustmentSummary>('GET', '/adjustments/summary')
}

export function getAdjustment(id: string) {
  return api<Adjustment>('GET', `/adjustments/${id}`)
}

export function createAdjustment(input: AdjustmentInput) {
  return api<Adjustment>('POST', '/adjustments', { body: input })
}

/** Open adjustments only. Changing just the physical count keeps the recorded snapshot (does not clear staleness) */
export function updateAdjustment(id: string, input: Partial<AdjustmentInput>) {
  return api<Adjustment>('PATCH', `/adjustments/${id}`, { body: input })
}

/** Stale adjustment: re-read the recorded quantity + stock version and store the new physical count (≥ 0, max 3 decimals) */
export function recountAdjustment(id: string, physicalQuantity: number) {
  return api<Adjustment>('POST', `/adjustments/${id}/recount`, { body: { physicalQuantity } })
}

export function applyAdjustment(id: string) {
  return api<Adjustment>('POST', `/adjustments/${id}/apply`)
}

export function cancelAdjustment(id: string) {
  return api<Adjustment>('POST', `/adjustments/${id}/cancel`)
}

export function exportAdjustmentsCsv(filters: AdjustmentFilters) {
  return downloadFile('/adjustments/export', { ...filters }, 'StockSense_Adjustments.csv')
}
