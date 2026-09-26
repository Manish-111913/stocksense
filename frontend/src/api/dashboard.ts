import { api } from './client.ts'
import type { DashboardSummary, DocumentStatus, MovementType, OperationRow, Paginated } from './types.ts'

export interface OperationFilters {
  /** Reference, product name or SKU */
  search?: string
  documentType?: MovementType
  status?: DocumentStatus
  /** Transfers match on source or destination */
  warehouseId?: string
  locationId?: string
  categoryId?: string
  page?: number
  limit?: number
}

export function getDashboardSummary() {
  return api<DashboardSummary>('GET', '/dashboard/summary')
}

export function listOperations(filters: OperationFilters = {}) {
  return api<Paginated<OperationRow>>('GET', '/dashboard/operations', { query: { ...filters } })
}
