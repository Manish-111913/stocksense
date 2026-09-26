import '../../styles/dashboard.css'
import { useEffect, useState } from 'react'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { usePageChrome } from '../../hooks/usePageChrome.ts'
import { DashboardDock } from './DashboardDock.tsx'
import { DashboardFooter } from './DashboardFooter.tsx'
import { DashboardHeader } from './DashboardHeader.tsx'
import {
  KPI_FILTER_CARDS,
  LOW_STOCK_ITEMS,
  OPERATION_STATUS_CLASS,
  OPERATION_TYPE_ICON,
  OPERATIONS,
  operationSearchText,
  TYPE_FILTERS,
  type TypeFilter,
} from './data.ts'
import { NewOperationModal } from './NewOperationModal.tsx'

const REFRESH_BTN = 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md rounded-xl shadow-sm transition-all active:scale-95'
const TYPE_BTN_ACTIVE = 'type-filter-btn px-3 py-1 rounded-lg bg-surface-container-lowest text-on-surface shadow-sm font-medium transition-all'
const TYPE_BTN_INACTIVE = 'type-filter-btn px-3 py-1 rounded-lg text-on-surface-variant hover:text-on-surface transition-all'
const FILTER_SELECT = 'bg-surface-container-low text-on-surface font-label-md text-label-md px-3 py-1.5 rounded-xl outline-none focus:bg-surface-container transition-all cursor-pointer'

export default function DashboardPage() {
  useDocumentTitle('StockSense — Dashboard')
  usePageChrome('bg-surface text-on-surface antialiased', 'ss-dashboard')

  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<TypeFilter>('All')
  const [status, setStatus] = useState('All')
  const [location, setLocation] = useState('All')
  const [category, setCategory] = useState('All')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Refresh simulation: pulse for 600ms
  useEffect(() => {
    if (!isRefreshing) return
    const timer = setTimeout(() => setIsRefreshing(false), 600)
    return () => clearTimeout(timer)
  }, [isRefreshing])

  const query = search.trim().toLowerCase()
  const visibleOperations = OPERATIONS.filter(
    (op) =>
      (activeType === 'All' || op.type === activeType) &&
      (status === 'All' || op.status === status) &&
      (location === 'All' || op.location.includes(location)) &&
      (category === 'All' || op.category === category) &&
      (query === '' || operationSearchText(op).toLowerCase().includes(query)),
  )
  const hasResults = visibleOperations.length > 0

  function resetAll() {
    setSearch('')
    setStatus('All')
    setLocation('All')
    setCategory('All')
    setActiveType('All')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader />
      <main className="w-full pt-16 pb-12 flex-1 bg-surface">
        <div className="flex flex-col w-full">
          {/* Interactive Inventory Dashboard Content */}
          <div className="p-space-base md:p-space-xl max-w-7xl mx-auto w-full space-y-space-lg pb-24">
            {/* Top Action & Title Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-base bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
              <div className="space-y-space-xxs">
                <div className="flex items-center gap-space-sm">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Inventory Dashboard</h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    Active Sync
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">Monitor, reconcile, and audit inventory operations across multi-hub facilities in real time.</p>
              </div>
              {/* Quick Action Buttons */}
              <div className="flex items-center flex-wrap gap-space-sm">
                <button className={isRefreshing ? `${REFRESH_BTN} animate-pulse` : REFRESH_BTN} id="refreshDataBtn" onClick={() => setIsRefreshing(true)} type="button">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">sync</span>
                  <span>Refresh Data</span>
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md rounded-xl shadow-sm transition-all active:scale-95" type="button">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">file_download</span>
                  <span>Export Report</span>
                </button>
                <button className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary-container text-on-primary font-label-md text-label-md rounded-xl shadow-sm hover:opacity-95 transition-all active:scale-95" id="openNewOpModal" onClick={() => setIsModalOpen(true)} type="button">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>New Operation</span>
                </button>
              </div>
            </div>

            {/* 5 Key KPI Metric Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-base">
              {/* Card 1: Total Products */}
              <div className="bg-surface-container-lowest p-space-base rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">In Stock SKUs</span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[20px]">inventory_2</span>
                  </div>
                </div>
                <div className="mt-space-sm">
                  <div className="font-metric-currency text-metric-currency text-on-surface">2,450</div>
                  <div className="flex items-center gap-1 mt-1 text-on-surface-variant font-label-sm text-label-sm">
                    <span className="text-secondary font-semibold">14 categories</span>
                    <span>across 3 hubs</span>
                  </div>
                </div>
              </div>
              {/* Card 2: Low / Out of Stock */}
              <div className="bg-surface-container-lowest p-space-base rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Inventory Risk</span>
                  <div className="w-8 h-8 rounded-lg bg-error-container/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                  </div>
                </div>
                <div className="mt-space-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-metric-currency text-metric-currency text-on-surface">39</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">at risk</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-surface-container-high text-on-surface">32 Low</span>
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-error-container text-on-error-container">7 Depleted</span>
                  </div>
                </div>
              </div>
              {/* Cards 3–5: Pending Receipts / Pending Deliveries / Transfers */}
              {KPI_FILTER_CARDS.map((card) => (
                <div className="bg-surface-container-lowest p-space-base rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer group" key={card.type} onClick={() => setActiveType(card.type)}>
                  <div className="flex items-start justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{card.label}</span>
                    <div className={card.iconBoxClassName}>
                      <span className={card.iconClassName}>{card.icon}</span>
                    </div>
                  </div>
                  <div className="mt-space-sm">
                    <div className="font-metric-currency text-metric-currency text-on-surface">{card.value}</div>
                    <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm mt-1">
                      <span>{card.caption}</span>
                      <span className="text-primary font-medium group-hover:underline">View →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic Filter Bar & Segment Switcher */}
            <div className="bg-surface-container-lowest p-space-base rounded-xl shadow-sm space-y-space-md">
              {/* Search and Quick Pills */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-base">
                {/* Search Field */}
                <div className="relative flex-1 min-w-[280px]">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">search</span>
                  <input className="w-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm pl-9 pr-8 py-2 rounded-xl outline-none focus:bg-surface-container transition-all" id="tableSearchInput" onChange={(e) => setSearch(e.target.value)} placeholder="Search by document, product, or SKU..." type="text" value={search} />
                  <button className={query.length === 0 ? 'hidden absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface' : 'absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface'} id="clearSearchBtn" onClick={() => setSearch('')} type="button">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
                {/* Filter Selects */}
                <div className="flex flex-wrap items-center gap-space-sm">
                  {/* Document Type Segmented Tabs */}
                  <div className="flex items-center p-1 bg-surface-container-low rounded-xl gap-0.5 text-label-sm font-label-sm" id="typeTabs">
                    {TYPE_FILTERS.map((filter) => (
                      <button className={filter.type === activeType ? TYPE_BTN_ACTIVE : TYPE_BTN_INACTIVE} data-type={filter.type} key={filter.type} onClick={() => setActiveType(filter.type)}>
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  {/* Status Dropdown */}
                  <select className={FILTER_SELECT} id="statusFilter" onChange={(e) => setStatus(e.target.value)} value={status}>
                    <option value="All">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Waiting">Waiting</option>
                    <option value="Ready">Ready</option>
                    <option value="Done">Done</option>
                    <option value="Canceled">Canceled</option>
                  </select>
                  {/* Warehouse / Location */}
                  <select className={FILTER_SELECT} id="locationFilter" onChange={(e) => setLocation(e.target.value)} value={location}>
                    <option value="All">All Locations</option>
                    <option value="Main Warehouse">Main Warehouse (WH-West)</option>
                    <option value="West Facility">West Facility</option>
                    <option value="East Depot">East Depot (WH-East)</option>
                    <option value="East Depot -> Main">East Depot -&gt; Main</option>
                  </select>
                  {/* Category */}
                  <select className={FILTER_SELECT} id="categoryFilter" onChange={(e) => setCategory(e.target.value)} value={category}>
                    <option value="All">All Categories</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Finished Goods">Finished Goods</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Raw Materials">Raw Materials</option>
                  </select>
                  {/* Clear Filters */}
                  <button className="p-1.5 rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-all" id="resetFiltersBtn" onClick={resetAll} title="Reset All Filters" type="button">
                    <span className="material-symbols-outlined text-[20px]">filter_alt_off</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Operations Ledger Table Section */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
              {/* Table Header Bar */}
              <div className="p-space-base flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs bg-surface-container-lowest">
                <div className="flex items-center gap-space-sm">
                  <span className="font-headline-sm text-headline-sm text-on-surface">Operations Ledger</span>
                  <span className="font-metric-tabular-sm text-metric-tabular-sm px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-medium" id="operationsCountBadge">
                    Showing {visibleOperations.length} of {OPERATIONS.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Sort by: Date (Newest)</span>
                  <button className="p-1 rounded text-on-surface-variant hover:bg-surface-container-low transition-colors" type="button">
                    <span className="material-symbols-outlined text-[16px]">swap_vert</span>
                  </button>
                </div>
              </div>
              {/* Responsive Data Table */}
              <div className="overflow-x-auto w-full">
                <table className={hasResults ? 'w-full text-left border-collapse' : 'w-full text-left border-collapse hidden'} id="operationsTable">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                      <th className="py-2.5 px-4 font-semibold">Document</th>
                      <th className="py-2.5 px-4 font-semibold">Type</th>
                      <th className="py-2.5 px-4 font-semibold">Product &amp; Category</th>
                      <th className="py-2.5 px-4 font-semibold">Location</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Quantity</th>
                      <th className="py-2.5 px-4 font-semibold">Status</th>
                      <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-sm text-body-sm text-on-surface" id="operationsTableBody">
                    {visibleOperations.map((op) => (
                      <tr className="op-row hover:bg-surface-container-low/60 transition-colors" data-category={op.category} data-location={op.location} data-search={operationSearchText(op)} data-status={op.status} data-type={op.type} key={op.document}>
                        <td className="py-3 px-4 font-metric-tabular-sm text-metric-tabular-sm font-semibold text-primary">{op.document}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface font-medium">
                            <span className={OPERATION_TYPE_ICON[op.type].className}>{OPERATION_TYPE_ICON[op.type].icon}</span> {op.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-on-surface">{op.product}</div>
                          <div className="font-label-sm text-label-sm text-on-surface-variant">{op.category}</div>
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant">{op.locationLabel ?? op.location}</td>
                        <td className={op.quantityClassName}>{op.quantity}</td>
                        <td className="py-3 px-4">
                          <span className={OPERATION_STATUS_CLASS[op.status]}>{op.status}</span>
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant font-label-sm text-label-sm">{op.timestamp}</td>
                        <td className="py-3 px-4 text-center">
                          <button className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold transition-all" type="button">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Empty State UI */}
              <div className={hasResults ? 'hidden p-space-2xl text-center flex-col items-center justify-center space-y-space-sm' : 'p-space-2xl text-center flex-col items-center justify-center space-y-space-sm flex'} id="noResultsState">
                <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[28px]">search_off</span>
                </div>
                <div className="font-headline-sm text-headline-sm text-on-surface">No inventory operations found</div>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">No operation matches the current search query and filter criteria.</p>
                <button className="px-4 py-2 bg-surface-container text-primary font-label-md text-label-md rounded-xl hover:bg-surface-container-high transition-colors" id="emptyClearBtn" onClick={resetAll} type="button">
                  Clear Filters
                </button>
              </div>
              {/* Pagination / Footer Bar */}
              <div className="p-space-base bg-surface-container-low/40 flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Page 1 of 5 (28 records total)</span>
                <div className="flex items-center gap-space-xs">
                  <button className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md shadow-sm opacity-50 cursor-not-allowed" type="button">
                    Previous
                  </button>
                  <span className="px-3 py-1 font-metric-tabular-sm text-metric-tabular-sm font-medium text-on-surface">1</span>
                  <button className="px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md shadow-sm transition-all" type="button">
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Low Stock Alert Section (Severity Strip Layout) */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-base md:p-space-lg space-y-space-base">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
                <div className="flex items-center gap-space-sm">
                  <div className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Low Stock Items</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">Action required: 4 items below threshold</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">Auto-reorder suggestions enabled</span>
              </div>
              {/* Critical Item Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-base">
                {LOW_STOCK_ITEMS.map((item) => (
                  <div className="relative bg-surface-container-low rounded-xl p-space-base flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md transition-shadow" key={item.sku}>
                    <div className={item.stripClassName} />
                    <div className="pl-2 space-y-space-xxs">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">{item.sku}</span>
                          <h3 className="font-headline-sm text-headline-sm text-on-surface">{item.name}</h3>
                        </div>
                        <span className={item.badgeClassName}>{item.badge}</span>
                      </div>
                      <div className="pt-space-xs text-on-surface-variant font-body-sm text-body-sm">
                        <div>Location: <span className="text-on-surface font-medium">{item.location}</span></div>
                        <div className="flex items-center justify-between mt-1">
                          <span>Stock: <strong className={item.stockClassName}>{item.stock}</strong></span>
                          <span>Threshold: <strong className="text-on-surface font-mono">{item.threshold}</strong></span>
                        </div>
                      </div>
                    </div>
                    <div className="pl-2 pt-space-base mt-2">
                      <button className={item.actionClassName} type="button">
                        {item.action}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DashboardDock />
          <NewOperationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
      </main>
      <DashboardFooter />
    </div>
  )
}
