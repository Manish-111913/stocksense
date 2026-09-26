import { api, downloadFile } from './client.ts'
import type { Category, Paginated, Product, ProductSummary, RecordStatus, StockStatus } from './types.ts'

export interface ProductFilters {
  search?: string
  categoryId?: string
  status?: RecordStatus
  stockStatus?: StockStatus
  warehouseId?: string
}

export interface ProductInput {
  name: string
  sku: string
  categoryId: string
  unitOfMeasure: string
  reorderLevel?: number
}

/** SKU can't change after creation */
export type ProductUpdate = Partial<Omit<ProductInput, 'sku'>>

export function listProducts(filters: ProductFilters & { page?: number; limit?: number }) {
  return api<Paginated<Product>>('GET', '/products', { query: { ...filters } })
}

export function getProductSummary() {
  return api<ProductSummary>('GET', '/products/summary')
}

export function getProduct(id: string) {
  return api<Product>('GET', `/products/${id}`)
}

export function createProduct(input: ProductInput) {
  return api<Product>('POST', '/products', { body: input })
}

export function updateProduct(id: string, input: ProductUpdate) {
  return api<Product>('PATCH', `/products/${id}`, { body: input })
}

/** Inventory managers only */
export function setProductStatus(id: string, status: RecordStatus) {
  return api<Product>('PATCH', `/products/${id}/status`, { body: { status } })
}

export function exportProductsCsv(filters: ProductFilters) {
  return downloadFile('/products/export', { ...filters }, 'StockSense_Products.csv')
}

export function listCategories(status?: RecordStatus) {
  return api<Category[]>('GET', '/categories', { query: { status } })
}

export function createCategory(input: { name: string; description?: string }) {
  return api<Category>('POST', '/categories', { body: input })
}

export function updateCategory(id: string, input: { name?: string; description?: string }) {
  return api<Category>('PATCH', `/categories/${id}`, { body: input })
}

/** Inventory managers only */
export function setCategoryStatus(id: string, status: RecordStatus) {
  return api<Category>('PATCH', `/categories/${id}/status`, { body: { status } })
}
