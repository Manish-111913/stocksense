import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { productDetailPath, ROUTES } from '../../routes.ts'
import { LocationPopover } from './components/LocationPopover.tsx'
import { ProductTableRow } from './components/ProductTableRow.tsx'
import { QuickEditDrawer } from './components/QuickEditDrawer.tsx'
import { exportProductsCSV, productSearchText, useActiveSkuCount, useProducts, type HubStock } from './productsData.ts'

interface LocationPopoverState {
  productName: string
  hubs: HubStock[]
}

export default function ProductsListPage() {
  useDocumentTitle('StockSense — Products Management')
  const navigate = useNavigate()
  const { showToast } = useToast()
  const products = useProducts()
  const activeSkuCount = useActiveSkuCount()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [locationFilter, setLocationFilter] = useState('ALL')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [locationPopover, setLocationPopover] = useState<LocationPopoverState | null>(null)
  const [drawerSku, setDrawerSku] = useState<string | null>(null)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Close context menus if clicking outside (the toggle buttons stop propagation)
  useEffect(() => {
    if (!openMenuId) return
    function handleDocumentClick(event: globalThis.MouseEvent) {
      if (!(event.target instanceof Element) || !event.target.closest('[id^="menu-row-"]')) setOpenMenuId(null)
    }
    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [openMenuId])

  // Matches the row text like the original; the location filter is not applied there either
  const searchVal = search.toLowerCase()
  const visibleProducts = products.filter((product) => {
    const text = productSearchText(product)
    const matchesSearch = !searchVal || text.includes(searchVal)
    const matchesCat = categoryFilter === 'ALL' || text.includes(categoryFilter.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || text.includes(statusFilter.toLowerCase())
    return matchesSearch && matchesCat && matchesStatus
  })

  function clearFilters() {
    setSearch('')
    setCategoryFilter('ALL')
    setStatusFilter('ALL')
    setLocationFilter('ALL')
  }

  function triggerRestock(sku: string) {
    showToast('Restock Queued', `Purchase Requisition generated for ${sku}.`)
  }

  function handleQuickEditSaved(sku: string) {
    setDrawerSku(null)
    showToast('Product updated', `Product ${sku} configuration saved.`)
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
            <button className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all" onClick={exportProductsCSV}>
              <span className="material-symbols-outlined text-[17px] text-slate-500">download</span>
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
              <span className="text-2xl font-bold font-mono text-slate-900" id="kpi-total-skus">{activeSkuCount}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Operational catalog</span>
              <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Across 3 Warehouses</span>
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
              <span className="text-2xl font-bold font-mono text-slate-900">132</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>89.1% healthy allocation</span>
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
              <span className="text-2xl font-bold font-mono text-slate-900">11</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Automated PO queued</span>
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
              <span className="text-2xl font-bold font-mono text-rose-600">5</span>
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
              <input className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all" id="searchInput" onChange={(e) => setSearch(e.target.value)} placeholder="Search by product name or SKU..." type="text" value={search} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <select className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer" id="filterCategory" onChange={(e) => setCategoryFilter(e.target.value)} value={categoryFilter}>
                  <option value="ALL">All Categories</option>
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="Finished Goods">Finished Goods</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Consumables">Consumables</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2 text-slate-400 text-base">expand_more</span>
              </div>
              <div className="relative">
                <select className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer" id="filterStatus" onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter}>
                  <option value="ALL">All Statuses</option>
                  <option value="In Stock">In Stock</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2 text-slate-400 text-base">expand_more</span>
              </div>
              <div className="relative">
                <select className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer" id="filterLocation" onChange={(e) => setLocationFilter(e.target.value)} value={locationFilter}>
                  <option value="ALL">All Locations</option>
                  <option value="Main Warehouse">Main Warehouse</option>
                  <option value="West Facility">West Facility</option>
                  <option value="East Depot">East Depot</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2 text-slate-400 text-base">expand_more</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <span className="text-xs text-slate-500" id="activeFilterBadge">{`Showing ${visibleProducts.length} of 148 items`}</span>
            <button className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors" onClick={clearFilters}>
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              <span>Clear Filters</span>
            </button>
          </div>
        </div>

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
              <tbody className="divide-y divide-slate-100 text-xs" id="tableBody">
                {visibleProducts.map((product) => (
                  <ProductTableRow
                    isMenuOpen={openMenuId === product.menuId}
                    key={product.menuId}
                    onOpenLocations={(productName, hubs) => setLocationPopover({ productName, hubs })}
                    onQuickEdit={setDrawerSku}
                    onRestock={triggerRestock}
                    onToggleMenu={() => setOpenMenuId((current) => (current === product.menuId ? null : product.menuId))}
                    onViewDetail={(sku) => navigate(productDetailPath(sku))}
                    product={product}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>Showing <span className="font-semibold text-slate-700">1</span> to <span className="font-semibold text-slate-700">7</span> of <span className="font-semibold text-slate-700">148</span> products · Page 1 of 22</div>
            <div className="flex items-center gap-1">
              <button className="px-2.5 py-1 rounded-md border border-slate-200 text-slate-400 cursor-not-allowed flex items-center gap-1 font-medium" disabled>
                <span className="material-symbols-outlined text-xs">arrow_back</span>
                <span>Prev</span>
              </button>
              <button className="w-7 h-7 rounded-md bg-indigo-600 text-white font-semibold flex items-center justify-center">1</button>
              <button className="w-7 h-7 rounded-md hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center">2</button>
              <button className="w-7 h-7 rounded-md hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center">3</button>
              <span className="px-1 text-slate-400">...</span>
              <button className="w-7 h-7 rounded-md hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center">22</button>
              <button className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1 font-medium transition-colors">
                <span>Next</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Stock by Location Popover Modal */}
      {locationPopover && <LocationPopover hubs={locationPopover.hubs} onClose={() => setLocationPopover(null)} productName={locationPopover.productName} />}

      {/* Quick Edit Drawer */}
      {drawerSku !== null && <QuickEditDrawer onClose={() => setDrawerSku(null)} onSaved={handleQuickEditSaved} sku={drawerSku} />}
    </>
  )
}
