import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { exportProductsCsv, getProductSummary, listCategories, listProducts, setProductStatus, type ProductFilters } from '../../api/products.ts'
import { STOCK_STATUS_LABEL, type Category, type Paginated, type Product, type ProductSummary, type StockStatus, type Warehouse } from '../../api/types.ts'
import { listWarehouses } from '../../api/warehouses.ts'
import { useCurrentUser } from '../../auth/useAuth.ts'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { productDetailPath, ROUTES } from '../../routes.ts'
import { CategoriesDrawer } from './components/CategoriesDrawer.tsx'
import { LocationPopover } from './components/LocationPopover.tsx'
import { ProductTableRow } from './components/ProductTableRow.tsx'
import { QuickEditDrawer } from './components/QuickEditDrawer.tsx'
import { errorMessage, formatQty, plural, useDebouncedValue } from './productsData.ts'

const PAGE_SIZE = 10
const TABLE_COLUMNS = 8
const STOCK_STATUSES = Object.keys(STOCK_STATUS_LABEL) as StockStatus[]

const PAGER_BTN = 'px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1 font-medium transition-colors'
const PAGER_BTN_DISABLED = 'px-2.5 py-1 rounded-md border border-slate-200 text-slate-400 cursor-not-allowed flex items-center gap-1 font-medium'
const PAGE_BTN = 'w-7 h-7 rounded-md hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center'
const PAGE_BTN_ACTIVE = 'w-7 h-7 rounded-md bg-indigo-600 text-white font-semibold flex items-center justify-center'

/** Page buttons: first, last and the neighbours of the current page, with gaps in between */
function pageItems(current: number, total: number): (number | 'gap')[] {
  const pages = [...new Set([1, current - 1, current, current + 1, total])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const items: (number | 'gap')[] = []
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) items.push('gap')
    items.push(p)
  })
  return items
}

export default function ProductsListPage() {
  useDocumentTitle('StockSense — Products Management')
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isManager = useCurrentUser()?.role === 'INVENTORY_MANAGER'

  // The header search opens /products?search=<term>: it seeds the search box
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlSearch = searchParams.get('search') ?? ''

  const [search, setSearch] = useState(urlSearch)
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StockStatus | ''>('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  // Searching again from the header while on this page (a new navigation, even to the same URL) re-syncs the box
  const [syncedLocationKey, setSyncedLocationKey] = useState(location.key)
  if (location.key !== syncedLocationKey) {
    setSyncedLocationKey(location.key)
    setSearch(urlSearch)
    setPage(1)
  }

  const [result, setResult] = useState<Paginated<Product> | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  // Key of the last request that settled; anything else means a request is in flight
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const [summary, setSummary] = useState<ProductSummary | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [locationProduct, setLocationProduct] = useState<Product | null>(null)
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null)
  const [showCategories, setShowCategories] = useState(false)

  const currentFilters = useMemo<ProductFilters>(
    () => ({
      search: debouncedSearch || undefined,
      categoryId: categoryFilter || undefined,
      stockStatus: statusFilter || undefined,
      warehouseId: warehouseFilter || undefined,
    }),
    [debouncedSearch, categoryFilter, statusFilter, warehouseFilter],
  )
  const hasFilters = Boolean(currentFilters.search || currentFilters.categoryId || currentFilters.stockStatus || currentFilters.warehouseId)
  const requestKey = `${JSON.stringify(currentFilters)}|${page}|${reloadKey}`
  const isLoading = settledKey !== requestKey
  const loadError = isLoading ? null : fetchError

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    listCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
    listWarehouses({ limit: 100 })
      .then((res) => setWarehouses(res.data))
      .catch(() => setWarehouses([]))
  }, [])

  // Products page for the current filters
  useEffect(() => {
    let cancelled = false
    listProducts({ ...currentFilters, page, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return
        // The page emptied (e.g. after a status change): step back to the last page
        if (res.data.length === 0 && page > 1 && res.pagination.totalPages > 0) {
          setPage(res.pagination.totalPages)
          return
        }
        setResult(res)
        setFetchError(null)
        setSettledKey(requestKey)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setFetchError(errorMessage(err, 'Could not load products. Please try again.'))
        setSettledKey(requestKey)
      })
    return () => {
      cancelled = true
    }
  }, [currentFilters, page, requestKey])

  // KPI cards
  useEffect(() => {
    let cancelled = false
    getProductSummary()
      .then((res) => {
        if (!cancelled) setSummary(res)
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // Close context menus if clicking outside (the toggle buttons stop propagation)
  useEffect(() => {
    if (!openMenuId) return
    function handleDocumentClick(event: globalThis.MouseEvent) {
      if (!(event.target instanceof Element) || !event.target.closest('[id^="menu-row-"]')) setOpenMenuId(null)
    }
    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [openMenuId])

  const refresh = useCallback(() => setReloadKey((key) => key + 1), [])
  const closeCategories = useCallback(() => setShowCategories(false), [])

  function clearFilters() {
    setSearch('')
    setCategoryFilter('')
    setStatusFilter('')
    setWarehouseFilter('')
    setPage(1)
    // Drop the header's search term too, so a reload doesn't bring it back
    if (searchParams.has('search')) {
      setSearchParams(
        (params) => {
          params.delete('search')
          return params
        },
        { replace: true },
      )
    }
  }

  async function handleExport() {
    setIsExporting(true)
    setActionError(null)
    try {
      await exportProductsCsv(currentFilters)
    } catch (err) {
      setActionError(errorMessage(err, 'Could not export products. Please try again.'))
    } finally {
      setIsExporting(false)
    }
  }

  async function handleToggleStatus(product: Product) {
    setOpenMenuId(null)
    setActionError(null)
    const next = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await setProductStatus(product.id, next)
      showToast(next === 'ACTIVE' ? 'Product activated' : 'Product deactivated', `${product.name} (${product.sku}) is now ${next === 'ACTIVE' ? 'active' : 'inactive'}.`)
      refresh()
    } catch (err) {
      setActionError(errorMessage(err, 'Could not change the product status. Please try again.'))
    }
  }

  function handleQuickEditSaved(product: Product) {
    setDrawerProduct(null)
    showToast('Product updated', `Product ${product.sku} configuration saved.`)
    refresh()
  }

  const rows = result?.data ?? []
  const pagination = result?.pagination
  const totalPages = Math.max(1, pagination?.totalPages ?? 1)
  const shownPage = pagination?.page ?? page
  const firstShown = rows.length > 0 ? (shownPage - 1) * (pagination?.limit ?? PAGE_SIZE) + 1 : 0
  const lastShown = firstShown > 0 ? firstShown + rows.length - 1 : 0
  const inStockPct = summary && summary.totalProducts > 0 ? ((summary.inStock / summary.totalProducts) * 100).toFixed(1) : '0.0'
  const kpi = (value: number | undefined) => (value === undefined ? '—' : formatQty(value))
  const activeCategories = categories.filter((category) => category.status === 'ACTIVE')

  function renderTableState() {
    if (loadError) {
      return (
        <tr>
          <td className="py-14 px-4 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">error</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">Couldn&apos;t load products</p>
            <p className="text-xs text-slate-500 mt-1">{loadError}</p>
            <button className="mt-4 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs inline-flex items-center gap-1.5 transition-all" onClick={refresh}>
              <span className="material-symbols-outlined text-[16px] text-slate-500">refresh</span>
              <span>Retry</span>
            </button>
          </td>
        </tr>
      )
    }
    if (!result || (isLoading && rows.length === 0)) {
      return (
        <tr>
          <td className="py-14 px-4 text-center text-xs text-slate-500" colSpan={TABLE_COLUMNS}>
            <span className="material-symbols-outlined text-[22px] text-slate-400 animate-spin block mx-auto mb-2 w-fit">progress_activity</span>
            Loading products...
          </td>
        </tr>
      )
    }
    if (rows.length === 0) {
      return (
        <tr>
          <td className="py-14 px-4 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">{hasFilters ? 'search_off' : 'inventory_2'}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{hasFilters ? 'No products match your filters' : 'No products yet'}</p>
            <p className="text-xs text-slate-500 mt-1">{hasFilters ? 'Try a different search term or clear the filters.' : 'Add your first product to start tracking its stock.'}</p>
            {hasFilters ? (
              <button className="mt-4 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs inline-flex items-center gap-1.5 transition-all" onClick={clearFilters}>
                <span className="material-symbols-outlined text-[16px] text-slate-500">restart_alt</span>
                <span>Clear Filters</span>
              </button>
            ) : (
              <button className="mt-4 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-[0.98]" onClick={() => navigate(ROUTES.productNew)}>
                <span className="material-symbols-outlined text-[17px]">add</span>
                <span>Add Product</span>
              </button>
            )}
          </td>
        </tr>
      )
    }
    return rows.map((product) => (
      <ProductTableRow
        canManageStatus={isManager}
        isMenuOpen={openMenuId === product.id}
        key={product.id}
        onOpenLocations={setLocationProduct}
        onQuickEdit={(p) => {
          setOpenMenuId(null)
          setDrawerProduct(p)
        }}
        onToggleMenu={() => setOpenMenuId((current) => (current === product.id ? null : product.id))}
        onToggleStatus={handleToggleStatus}
        onViewDetail={(p) => navigate(productDetailPath(p.id))}
        product={product}
      />
    ))
  }

  return (
    <>
      {/* VIEW 1: PRODUCTS DIRECTORY (TABLE & STATS) */}
      <main className="w-full space-y-6 bg-slate-50/40 p-4 sm:p-6 transition-all duration-150" id="view-products-list">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products</h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active Catalog
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">Manage products, stock availability, categories, and reorder rules across distributed nodes.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all" id="btnManageCategories" onClick={() => setShowCategories(true)}>
              <span aria-hidden="true" className="material-symbols-outlined text-[17px] text-slate-500">category</span>
              <span>Categories</span>
            </button>
            <button className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-60" disabled={isExporting} onClick={handleExport}>
              <span className={isExporting ? 'material-symbols-outlined text-[17px] text-slate-500 animate-spin' : 'material-symbols-outlined text-[17px] text-slate-500'}>{isExporting ? 'progress_activity' : 'download'}</span>
              <span>Export CSV</span>
            </button>
            <button className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98]" onClick={() => navigate(ROUTES.productNew)}>
              <span className="material-symbols-outlined text-[17px]">add</span>
              <span>+ Add Product</span>
            </button>
          </div>
        </div>

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Active SKUs</span>
              <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[17px]">category</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900" id="kpi-total-skus">{kpi(summary?.totalProducts)}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Operational catalog</span>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{summary ? `Across ${plural(summary.warehouses, 'Warehouse')}` : 'Across — Warehouses'}</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">In Stock</span>
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[17px]">check_circle</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">{kpi(summary?.inStock)}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>{`${inStockPct}% healthy allocation`}</span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Good Standing</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Low Stock</span>
              <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[17px]">warning</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">{kpi(summary?.lowStock)}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>At or below reorder level</span>
              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Requires Reorder</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Depleted / OOS</span>
              <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[17px]">block</span>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-rose-600">{kpi(summary?.outOfStock)}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Impacting deliveries</span>
              <span className="text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded">Critical</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
              <input
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                id="searchInput"
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search by product name or SKU..."
                type="text"
                value={search}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <select
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                  id="filterCategory"
                  onChange={(e) => {
                    setCategoryFilter(e.target.value)
                    setPage(1)
                  }}
                  value={categoryFilter}
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.status === 'ACTIVE' ? category.name : `${category.name} (inactive)`}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2 text-slate-400 text-base">expand_more</span>
              </div>
              <div className="relative">
                <select
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                  id="filterStatus"
                  onChange={(e) => {
                    setStatusFilter(e.target.value as StockStatus | '')
                    setPage(1)
                  }}
                  value={statusFilter}
                >
                  <option value="">All Statuses</option>
                  {STOCK_STATUSES.map((status) => (
                    <option key={status} value={status}>{STOCK_STATUS_LABEL[status]}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2 text-slate-400 text-base">expand_more</span>
              </div>
              <div className="relative">
                {/* Products with stock in the chosen warehouse */}
                <select
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                  id="filterLocation"
                  onChange={(e) => {
                    setWarehouseFilter(e.target.value)
                    setPage(1)
                  }}
                  value={warehouseFilter}
                >
                  <option value="">All Locations</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2 text-slate-400 text-base">expand_more</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <span className="text-xs text-slate-500" id="activeFilterBadge">{pagination ? `Showing ${rows.length} of ${formatQty(pagination.total)} items` : 'Loading items...'}</span>
            <button className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors" onClick={clearFilters}>
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              <span>Clear Filters</span>
            </button>
          </div>
        </div>

        {actionError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {actionError}
            </span>
            <button className="p-0.5 rounded text-rose-500 hover:text-rose-700" onClick={() => setActionError(null)}>
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Catalog Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="productsTable">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4" scope="col">Product</th>
                  <th className="py-3 px-4" scope="col">SKU / Code</th>
                  <th className="py-3 px-4" scope="col">Category</th>
                  <th className="py-3 px-4" scope="col">UOM</th>
                  <th className="py-3 px-4 text-right" scope="col">Total Locations / Stock Breakdown</th>
                  <th className="py-3 px-4" scope="col">Stock Status</th>
                  <th className="py-3 px-4" scope="col">Reorder Rule</th>
                  <th className="py-3 px-4 text-center" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody className={isLoading && rows.length > 0 ? 'divide-y divide-slate-100 text-xs opacity-60 transition-opacity' : 'divide-y divide-slate-100 text-xs'} id="tableBody">
                {renderTableState()}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loadError && pagination && pagination.total > 0 && (
            <div className="px-4 py-3 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Showing <span className="font-semibold text-slate-700">{firstShown}</span> to <span className="font-semibold text-slate-700">{lastShown}</span> of{' '}
                <span className="font-semibold text-slate-700">{formatQty(pagination.total)}</span> products · Page {shownPage} of {totalPages}
              </div>
              <div className="flex items-center gap-1">
                <button className={page <= 1 ? PAGER_BTN_DISABLED : PAGER_BTN} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <span className="material-symbols-outlined text-xs">arrow_back</span>
                  <span>Prev</span>
                </button>
                {pageItems(page, totalPages).map((item, index) =>
                  item === 'gap' ? (
                    <span className="px-1 text-slate-400" key={`gap-${index}`}>...</span>
                  ) : (
                    <button className={item === page ? PAGE_BTN_ACTIVE : PAGE_BTN} key={item} onClick={() => setPage(item)}>
                      {item}
                    </button>
                  ),
                )}
                <button className={page >= totalPages ? PAGER_BTN_DISABLED : PAGER_BTN} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <span>Next</span>
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Stock by Location Popover Modal */}
      {locationProduct && <LocationPopover locations={locationProduct.stock.locations} onClose={() => setLocationProduct(null)} productName={locationProduct.name} uom={locationProduct.unitOfMeasure} />}

      {/* Quick Edit Drawer */}
      {drawerProduct && <QuickEditDrawer categories={activeCategories} onClose={() => setDrawerProduct(null)} onSaved={handleQuickEditSaved} product={drawerProduct} />}

      {/* Manage Categories Drawer (its list refreshes the category filter too) */}
      {showCategories && <CategoriesDrawer canManageStatus={isManager} onCategoriesLoaded={setCategories} onChanged={refresh} onClose={closeCategories} />}
    </>
  )
}
