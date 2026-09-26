import { api } from './client.ts'
import type { Location, Paginated, RecordStatus, Warehouse, WarehouseSummary } from './types.ts'

// Warehouse / location writes are INVENTORY_MANAGER only (403 otherwise)

export function listWarehouses(filters: { search?: string; status?: RecordStatus; page?: number; limit?: number } = {}) {
  return api<Paginated<Warehouse>>('GET', '/warehouses', { query: { ...filters } })
}

export function getWarehouseSummary() {
  return api<WarehouseSummary>('GET', '/warehouses/summary')
}

export function getWarehouse(id: string) {
  return api<Warehouse>('GET', `/warehouses/${id}`)
}

/** Code is uppercased server-side; 409 if it already exists */
export function createWarehouse(input: { name: string; code: string; description?: string }) {
  return api<Warehouse>('POST', '/warehouses', { body: input })
}

/** Send description: '' to clear it */
export function updateWarehouse(id: string, input: { name?: string; code?: string; description?: string }) {
  return api<Warehouse>('PATCH', `/warehouses/${id}`, { body: input })
}

/** 409 when deactivating a warehouse that still holds stock */
export function setWarehouseStatus(id: string, status: RecordStatus) {
  return api<Warehouse>('PATCH', `/warehouses/${id}/status`, { body: { status } })
}

/** Locations across warehouses (for pickers and filters) */
export function listLocations(filters: { warehouseId?: string; status?: RecordStatus; search?: string } = {}) {
  return api<Location[]>('GET', '/locations', { query: { ...filters } })
}

/** Warehouse must be active; code unique within the warehouse (409) */
export function createLocation(warehouseId: string, input: { name: string; code: string }) {
  return api<Location>('POST', `/warehouses/${warehouseId}/locations`, { body: input })
}

export function updateLocation(id: string, input: { name?: string; code?: string }) {
  return api<Location>('PATCH', `/locations/${id}`, { body: input })
}

/** 409 when deactivating a location holding stock; 400 when activating inside an inactive warehouse */
export function setLocationStatus(id: string, status: RecordStatus) {
  return api<Location>('PATCH', `/locations/${id}/status`, { body: { status } })
}
