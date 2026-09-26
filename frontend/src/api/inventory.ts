import { api } from './client.ts'
import type { AvailableStock, Paginated, ProductStockLevel, StockPosition } from './types.ts'

// Read-only: stock only changes through receipts, deliveries, transfers and adjustments

export interface InventoryFilters {
  search?: string
  productId?: string
  warehouseId?: string
  locationId?: string
  categoryId?: string
  lowStock?: boolean
  outOfStock?: boolean
  page?: number
  limit?: number
}

export function listInventory(filters: InventoryFilters = {}) {
  const { lowStock, outOfStock, ...rest } = filters
  return api<Paginated<StockPosition>>('GET', '/inventory', {
    query: { ...rest, lowStock: lowStock ? 'true' : undefined, outOfStock: outOfStock ? 'true' : undefined },
  })
}

export function listLowStock(page = 1, limit = 20) {
  return api<Paginated<ProductStockLevel>>('GET', '/inventory/low-stock', { query: { page, limit } })
}

export function listOutOfStock(page = 1, limit = 20) {
  return api<Paginated<ProductStockLevel>>('GET', '/inventory/out-of-stock', { query: { page, limit } })
}

export function getAvailableStock(productId: string, locationId: string) {
  return api<AvailableStock>('GET', '/inventory/available', { query: { productId, locationId } })
}
