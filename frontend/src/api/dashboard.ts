import { api } from './client.ts'
import type { DashboardResponse, DashboardSummary, DocumentStatus, MovementType, OperationRow, Paginated, StockAlert } from './types.ts'

// Read-only aggregation over the real tables: the dashboard keeps no numbers of its own

export interface DashboardFilters {
  documentType?: MovementType
  status?: DocumentStatus
  /** Transfers match on source or destination */
  warehouseId?: string
  locationId?: string
  categoryId?: string
  /** Inclusive: YYYY-MM-DD (a whole UTC day) or a full ISO date-time (e.g. local midnight via toISOString) */
  dateFrom?: string
  /** Inclusive, same format as dateFrom */
  dateTo?: string
}

export interface OperationFilters extends DashboardFilters {
  /** Reference, product name or SKU */
  search?: string
  page?: number
  limit?: number
}

/** KPIs + the filters that were applied */
export function getDashboard(filters: DashboardFilters = {}) {
  return api<DashboardResponse>('GET', '/dashboard', { query: { ...filters } })
}

export function getInventorySummary(filters: Pick<DashboardFilters, 'warehouseId' | 'locationId' | 'categoryId'> = {}) {
  return api<Pick<DashboardSummary, 'totalProductsInStock' | 'totalProducts' | 'lowStock' | 'outOfStock'>>('GET', '/dashboard/inventory-summary', { query: { ...filters } })
}

export function getOperationsSummary(filters: DashboardFilters = {}) {
  return api<Pick<DashboardSummary, 'pendingReceipts' | 'pendingDeliveries' | 'internalTransfersScheduled' | 'pendingAdjustments'>>('GET', '/dashboard/operations-summary', { query: { ...filters } })
}

/** Out-of-stock first, then low stock; same scope rules as the stock KPIs */
export function listStockAlerts(filters: Pick<DashboardFilters, 'warehouseId' | 'locationId' | 'categoryId'> & { page?: number; limit?: number } = {}) {
  return api<Paginated<StockAlert>>('GET', '/dashboard/stock-alerts', { query: { ...filters } })
}

/** Document lines across receipts, deliveries, transfers and adjustments, newest first */
export function listOperations(filters: OperationFilters = {}) {
  return api<Paginated<OperationRow>>('GET', '/dashboard/operations', { query: { ...filters } })
}
