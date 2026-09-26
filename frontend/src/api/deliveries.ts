import { api, downloadFile } from './client.ts'
import type { Customer, Delivery, DeliverySummary, DocumentStatus, Paginated, RecordStatus, StockChangeLine } from './types.ts'

/**
 * Delivery workflow (enforced by the backend):
 * DRAFT →confirm→ READY (in stock now) or WAITING (short) ; WAITING →checkAvailability→ READY
 * READY →pick→ →pack→ →validate→ DONE (stock decreases + ledger; 409 INSUFFICIENT_STOCK if short at that moment)
 * DRAFT / WAITING / READY →cancel→ CANCELED. Only DRAFT and WAITING can be edited.
 */

export interface DeliveryFilters {
  search?: string
  status?: DocumentStatus
  customerId?: string
  warehouseId?: string
  sourceLocationId?: string
  /** YYYY-MM-DD */
  dateFrom?: string
  dateTo?: string
}

export interface DeliveryInput {
  customerId: string
  warehouseId: string
  /** Where the stock is taken from; must belong to the warehouse */
  sourceLocationId: string
  /** YYYY-MM-DD (defaults to today) */
  deliveryDate?: string
  /** One line per product, quantity > 0 */
  items: { productId: string; quantity: number }[]
}

export function listDeliveries(filters: DeliveryFilters & { page?: number; limit?: number } = {}) {
  return api<Paginated<Delivery>>('GET', '/deliveries', { query: { ...filters } })
}

export function getDeliverySummary() {
  return api<DeliverySummary>('GET', '/deliveries/summary')
}

export function getDelivery(id: string) {
  return api<Delivery>('GET', `/deliveries/${id}`)
}

export function createDelivery(input: DeliveryInput) {
  return api<Delivery>('POST', '/deliveries', { body: input })
}

/** DRAFT / WAITING only; `items` replaces all lines */
export function updateDelivery(id: string, input: Partial<DeliveryInput>) {
  return api<Delivery>('PATCH', `/deliveries/${id}`, { body: input })
}

export function confirmDelivery(id: string) {
  return api<Delivery>('POST', `/deliveries/${id}/confirm`)
}

export function checkDeliveryAvailability(id: string) {
  return api<Delivery>('POST', `/deliveries/${id}/check-availability`)
}

export function pickDelivery(id: string) {
  return api<Delivery>('POST', `/deliveries/${id}/pick`)
}

export function packDelivery(id: string) {
  return api<Delivery>('POST', `/deliveries/${id}/pack`)
}

/** READY + picked + packed → DONE; returns stock before/after per line */
export function validateDelivery(id: string) {
  return api<Delivery & { stockChanges: StockChangeLine[] }>('POST', `/deliveries/${id}/validate`)
}

export function cancelDelivery(id: string) {
  return api<Delivery>('POST', `/deliveries/${id}/cancel`)
}

export function exportDeliveriesCsv(filters: DeliveryFilters) {
  return downloadFile('/deliveries/export', { ...filters }, 'StockSense_Deliveries.csv')
}

export function listCustomers(filters: { search?: string; status?: RecordStatus } = {}) {
  return api<Customer[]>('GET', '/customers', { query: { ...filters } })
}

/** Code optional (uppercased, unique) */
export function createCustomer(input: { name: string; code?: string; email?: string; phone?: string }) {
  return api<Customer>('POST', '/customers', { body: input })
}

export function updateCustomer(id: string, input: { name?: string; code?: string; email?: string; phone?: string }) {
  return api<Customer>('PATCH', `/customers/${id}`, { body: input })
}

/** Inventory managers only */
export function setCustomerStatus(id: string, status: RecordStatus) {
  return api<Customer>('PATCH', `/customers/${id}/status`, { body: { status } })
}
