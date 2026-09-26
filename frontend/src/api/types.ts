// Shapes returned by the StockSense API (backend/src/**)

export type UserRole = 'INVENTORY_MANAGER' | 'WAREHOUSE_STAFF'
export type RecordStatus = 'ACTIVE' | 'INACTIVE'
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

export interface UserProfile {
  id: string
  fullName: string
  email: string
  phone: string | null
  role: UserRole
  status: RecordStatus
  createdAt: string
  lastLoginAt: string | null
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: UserProfile
}

export interface MessageResponse {
  message: string
}

export interface Paginated<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface Category {
  id: string
  name: string
  description: string | null
  status: RecordStatus
  productCount: number
  createdAt: string
  updatedAt: string
}

export interface ProductStockLocation {
  locationId: string
  locationName: string
  locationCode: string
  warehouseId: string
  warehouseName: string
  quantity: number
}

export interface Product {
  id: string
  name: string
  sku: string
  unitOfMeasure: string
  reorderLevel: number
  status: RecordStatus
  category: { id: string; name: string; status: RecordStatus }
  createdBy: { id: string; fullName: string }
  createdAt: string
  updatedAt: string
  stock: {
    onHand: number
    stockStatus: StockStatus
    locationCount: number
    locations: ProductStockLocation[]
  }
}

export interface ProductSummary {
  totalProducts: number
  inStock: number
  lowStock: number
  outOfStock: number
  warehouses: number
}

export const ROLE_LABEL: Record<UserRole, string> = {
  INVENTORY_MANAGER: 'Inventory Manager',
  WAREHOUSE_STAFF: 'Warehouse Staff',
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  IN_STOCK: 'In Stock',
  LOW_STOCK: 'Low Stock',
  OUT_OF_STOCK: 'Out of Stock',
}

export interface WarehouseLocation {
  id: string
  name: string
  code: string
  status: RecordStatus
  /** Distinct products currently stocked here */
  productCount: number
  createdAt: string
  updatedAt: string
}

export interface Warehouse {
  id: string
  name: string
  code: string
  /** Address or notes */
  description: string | null
  status: RecordStatus
  createdBy: { id: string; fullName: string }
  createdAt: string
  updatedAt: string
  locationCount: number
  activeLocationCount: number
  /** Distinct products currently stocked anywhere in the warehouse */
  productCount: number
  locations: WarehouseLocation[]
}

export interface WarehouseSummary {
  totalWarehouses: number
  activeWarehouses: number
  totalLocations: number
  activeLocations: number
  storedProducts: number
  topWarehouse: { id: string; name: string; code: string; productCount: number } | null
}

/** A location with its warehouse (from /locations) */
export interface Location {
  id: string
  name: string
  code: string
  status: RecordStatus
  warehouse: { id: string; name: string; code: string; status: RecordStatus }
  productCount: number
  createdAt: string
  updatedAt: string
}
