import '../../styles/dashboard.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { getDashboard, listOperations, listStockAlerts, type DashboardFilters, type OperationFilters } from '../../api/dashboard.ts'
import { listCategories } from '../../api/products.ts'
import { DOCUMENT_STATUS_LABEL, type Category, type DashboardSummary, type DocumentStatus, type OperationRow, type Paginated, type StockAlert, type Warehouse } from '../../api/types.ts'
import { listWarehouses } from '../../api/warehouses.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { usePageChrome } from '../../hooks/usePageChrome.ts'
import { productDetailPath, ROUTES } from '../../routes.ts'
import { errorMessage, formatQty, useDebouncedValue } from '../products/productsData.ts'
import { DashboardDock } from './DashboardDock.tsx'
import { DashboardFooter, type SyncState } from './DashboardFooter.tsx'
import { DashboardHeader } from './DashboardHeader.tsx'
import {
  ALERT_ACTION,
  ALERT_BADGE,
  ALERT_STOCK,
  ALERT_STRIP,
  alertTone,
  DATE_OPTIONS,
  dateRangeFor,
  formatTimestamp,
  KPI_FILTER_CARDS,
  OPERATION_STATUS_CLASS,
  OPERATION_TYPE_ICON,
  OPERATION_TYPE_LABEL,
  operationLocation,
  operationPath,
  operationQuantity,
  operationsCsv,
  QTY_CLASS,
  QTY_NEGATIVE_CLASS,
  STATUS_OPTIONS,
  TYPE_FILTERS,
  type DatePreset,
  type DateRange,
  type TypeFilter,
} from './data.ts'
import { NewOperationModal } from './NewOperationModal.tsx'

const PAGE_SIZE = 10
const ALERT_LIMIT = 8

const REFRESH_BTN = 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md rounded-xl shadow-sm transition-all active:scale-95'
const TYPE_BTN_ACTIVE = 'type-filter-btn px-3 py-1 rounded-lg bg-surface-container-lowest text-on-surface shadow-sm font-medium transition-all'
const TYPE_BTN_INACTIVE = 'type-filter-btn px-3 py-1 rounded-lg text-on-surface-variant hover:text-on-surface transition-all'
const FILTER_SELECT = 'bg-surface-container-low text-on-surface font-label-md text-label-md px-3 py-1.5 rounded-xl outline-none focus:bg-surface-container transition-all cursor-pointer'
const PAGER_BTN = 'px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md shadow-sm transition-all'
const PAGER_BTN_DISABLED = 'px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md shadow-sm opacity-50 cursor-not-allowed'
const STATE_BOX = 'p-space-2xl text-center flex-col items-center justify-center space-y-space-sm flex'
const STATE_ICON = 'w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant'
const STATE_BTN = 'px-4 py-2 bg-surface-container text-primary font-label-md text-label-md rounded-xl hover:bg-surface-container-high transition-colors'

/** Location filter value: a whole warehouse ("wh:<id>") or one location ("loc:<id>") */
function placeFilter(value: string): Pick<OperationFilters, 'warehouseId' | 'locationId'> {
  if (value.startsWith('wh:')) return { warehouseId: value.slice(3) }
  if (value.startsWith('loc:')) return { locationId: value.slice(4) }
  return {}
}

export default function DashboardPage() {
  useDocumentTitle('StockSense — Dashboard')
  usePageChrome('bg-surface text-on-surface antialiased', 'ss-dashboard')
  const navigate = useNavigate()
  const ledgerRef = useRef<HTMLDivElement>(null)
  const alertsRef = useRef<HTMLDivElement>(null)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [activeType, setActiveType] = useState<TypeFilter>('All')
  const [status, setStatus] = useState<DocumentStatus | ''>('')
  const [place, setPlace] = useState('')
  const [category, setCategory] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('')
  // Resolved when the preset is picked (and again on refresh, so "Today" follows the clock)
  const [dateRange, setDateRange] = useState<DateRange>({})
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // Summary (KPI cards, dock badges, footer)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [summaryKey, setSummaryKey] = useState<string | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [syncedAt, setSyncedAt] = useState<Date | null>(null)

  // Operations ledger
  const [operations, setOperations] = useState<Paginated<OperationRow> | null>(null)
  const [operationsError, setOperationsError] = useState<string | null>(null)
  const [settledKey, setSettledKey] = useState<string | null>(null)

  // Filter options
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Low / out of stock alerts
  const [alerts, setAlerts] = useState<StockAlert[] | null>(null)
  const [alertTotal, setAlertTotal] = useState(0)
  const [alertsError, setAlertsError] = useState<string | null>(null)
  const [alertsKey, setAlertsKey] = useState<string | null>(null)

  // Stock scope shared by the stock KPIs and the alert cards
  const stockFilters = useMemo<Pick<DashboardFilters, 'warehouseId' | 'locationId' | 'categoryId'>>(() => ({ categoryId: category || undefined, ...placeFilter(place) }), [category, place])
  // KPI filters: search and document type never change the counts
  const kpiFilters = useMemo<DashboardFilters>(() => ({ ...stockFilters, status: status || undefined, ...dateRange }), [stockFilters, status, dateRange])
  const filters = useMemo<OperationFilters>(
    () => ({
      ...kpiFilters,
      search: debouncedSearch || undefined,
      documentType: activeType === 'All' ? undefined : activeType,
    }),
    [kpiFilters, debouncedSearch, activeType],
  )
  const hasFilters = Boolean(search.trim() || activeType !== 'All' || status || place || category || datePreset)
  const isKpiFiltered = Boolean(status || place || category || datePreset)
  const requestKey = `${JSON.stringify(filters)}|${page}|${reloadKey}`
  const summaryRequestKey = `${JSON.stringify(kpiFilters)}|${reloadKey}`
  const alertsRequestKey = `${JSON.stringify(stockFilters)}|${reloadKey}`
  const isLoadingOperations = settledKey !== requestKey
  const isLoadingSummary = summaryKey !== summaryRequestKey
  const isLoadingAlerts = alertsKey !== alertsRequestKey
  const isRefreshing = isLoadingOperations || isLoadingSummary || isLoadingAlerts
  const syncState: SyncState = isLoadingSummary ? 'syncing' : summaryError ? 'offline' : 'online'

  // Filter options (warehouses carry their locations)
  useEffect(() => {
    let cancelled = false
    listWarehouses({ limit: 100 })
      .then((res) => {
        if (!cancelled) setWarehouses(res.data)
      })
      .catch(() => {
        if (!cancelled) setWarehouses([])
      })
    listCategories()
      .then((res) => {
        if (!cancelled) setCategories(res)
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // KPI summary for the current filters
  useEffect(() => {
    let cancelled = false
    const startedAt = performance.now()
    getDashboard(kpiFilters)
      .then((res) => {
        if (cancelled) return
        setSummary(res.summary)
        setSummaryError(null)
        setLatencyMs(Math.round(performance.now() - startedAt))
        setSyncedAt(new Date())
        setSummaryKey(summaryRequestKey)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setSummaryError(errorMessage(err, 'Could not load the dashboard summary.'))
        setSummaryKey(summaryRequestKey)
      })
    return () => {
      cancelled = true
    }
  }, [kpiFilters, summaryRequestKey])

  // Operations page for the current filters
  useEffect(() => {
    let cancelled = false
    listOperations({ ...filters, page, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return
        if (res.data.length === 0 && page > 1 && res.pagination.total > 0) {
          setPage(res.pagination.totalPages)
          return
        }
        setOperations(res)
        setOperationsError(null)
        setSettledKey(requestKey)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setOperationsError(errorMessage(err, 'Could not load operations. Please try again.'))
        setSettledKey(requestKey)
      })
    return () => {
      cancelled = true
    }
  }, [filters, page, requestKey])

  // Low / out of stock products (out of stock first), same scope as the stock KPIs
  useEffect(() => {
    let cancelled = false
    listStockAlerts({ ...stockFilters, limit: ALERT_LIMIT })
      .then((res) => {
        if (cancelled) return
        setAlerts(res.data)
        setAlertTotal(res.pagination.total)
        setAlertsError(null)
        setAlertsKey(alertsRequestKey)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setAlertsError(errorMessage(err, 'Could not load stock alerts.'))
        setAlertsKey(alertsRequestKey)
      })
    return () => {
      cancelled = true
    }
  }, [stockFilters, alertsRequestKey])

  function applyDatePreset(preset: DatePreset) {
    setDatePreset(preset)
    setDateRange(dateRangeFor(preset))
  }

  function refresh() {
    if (datePreset) setDateRange(dateRangeFor(datePreset))
    setReloadKey((key) => key + 1)
  }

  function updateFilter(apply: () => void) {
    apply()
    setPage(1)
  }

  function resetAll() {
    setSearch('')
    setStatus('')
    setPlace('')
    setCategory('')
    applyDatePreset('')
    setActiveType('All')
    setPage(1)
  }

  function filterByType(type: TypeFilter) {
    updateFilter(() => setActiveType(type))
    ledgerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function searchFromHeader(value: string) {
    updateFilter(() => setSearch(value))
    ledgerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Every operation matching the current filters, as CSV
  async function exportReport() {
    setIsExporting(true)
    setExportError(null)
    try {
      const allRows: OperationRow[] = []
      let current = 1
      let totalPages = 1
      do {
        const res = await listOperations({ ...filters, page: current, limit: 100 })
        allRows.push(...res.data)
        totalPages = res.pagination.totalPages
        current += 1
      } while (current <= totalPages)
      const blob = new Blob([operationsCsv(allRows)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `StockSense_Operations_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(errorMessage(err, 'Could not export the report.'))
    } finally {
      setIsExporting(false)
    }
  }

  const rows = operations?.data ?? []
  const total = operations?.pagination.total ?? 0
  const totalPages = operations?.pagination.totalPages ?? 1
  const showTable = !isLoadingOperations && !operationsError && rows.length > 0
  const atRisk = summary ? summary.lowStock + summary.outOfStock : null
  const metric = (value: number | undefined) => (value === undefined ? '—' : formatQty(value))

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader alertCount={atRisk ?? 0} onAlertsClick={() => alertsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} onSearch={searchFromHeader} />
      <main className="w-full pt-16 pb-12 flex-1 bg-surface">
        <div className="flex flex-col w-full">
          {/* Interactive Inventory Dashboard Content */}
          <div className="p-space-base md:p-space-xl max-w-7xl mx-auto w-full space-y-space-lg pb-24">
            {/* Top Action & Title Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-base bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
              <div className="space-y-space-xxs">
                <div className="flex items-center gap-space-sm">
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Inventory Dashboard</h1>
                  {syncState === 'offline' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-error" />
                      Offline
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                      {syncState === 'syncing' ? 'Syncing' : 'Active Sync'}
                    </span>
                  )}
                  {isKpiFiltered && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm font-semibold" title="KPI cards and stock alerts reflect the active filters">
                      <span className="material-symbols-outlined text-[14px]">filter_alt</span>
                      Filtered
                    </span>
                  )}
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">Monitor, reconcile, and audit inventory operations across your warehouses and locations.</p>
                {exportError && <p className="font-body-sm text-body-sm text-error">{exportError}</p>}
              </div>
              {/* Quick Action Buttons */}
              <div className="flex items-center flex-wrap gap-space-sm">
                <button className={isRefreshing ? `${REFRESH_BTN} animate-pulse` : REFRESH_BTN} disabled={isRefreshing} id="refreshDataBtn" onClick={refresh} type="button">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">sync</span>
                  <span>Refresh Data</span>
                </button>
                <button className={isExporting || total === 0 ? `${REFRESH_BTN} opacity-50 cursor-not-allowed` : REFRESH_BTN} disabled={isExporting || total === 0} onClick={() => void exportReport()} title={total === 0 ? 'No operations to export' : 'Download the filtered operations as CSV'} type="button">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">file_download</span>
                  <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
                </button>
                <button className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary-container text-on-primary font-label-md text-label-md rounded-xl shadow-sm hover:opacity-95 transition-all active:scale-95" id="openNewOpModal" onClick={() => setIsModalOpen(true)} type="button">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>New Operation</span>
                </button>
              </div>
            </div>

            {summaryError && (
              <div className="flex items-center justify-between gap-space-sm bg-error-container text-on-error-container p-space-md rounded-xl font-body-sm text-body-sm">
                <span className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {summaryError}
                </span>
                <button className="font-label-md text-label-md font-semibold underline" onClick={refresh} type="button">
                  Retry
                </button>
              </div>
            )}

            {/* 5 Key KPI Metric Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-base">
              {/* Card 1: Products in stock */}
              <div className={isLoadingSummary && !summary ? 'bg-surface-container-lowest p-space-base rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow animate-pulse' : 'bg-surface-container-lowest p-space-base rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow'}>
                <div className="flex items-start justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">In Stock SKUs</span>
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[20px]">inventory_2</span>
                  </div>
                </div>
                <div className="mt-space-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-metric-currency text-metric-currency text-on-surface">{metric(summary?.totalProductsInStock)}</span>
                    {summary && <span className="font-label-sm text-label-sm text-on-surface-variant">of {formatQty(summary.totalProducts)}</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-on-surface-variant font-label-sm text-label-sm">
                    <span className="text-secondary font-semibold">{summary ? `${formatQty(summary.categories)} ${summary.categories === 1 ? 'category' : 'categories'}` : '—'}</span>
                    {summary && <span>across {formatQty(summary.warehouses)} {summary.warehouses === 1 ? 'warehouse' : 'warehouses'}</span>}
                  </div>
                </div>
              </div>
              {/* Card 2: Low / Out of Stock */}
              <div className={isLoadingSummary && !summary ? 'bg-surface-container-lowest p-space-base rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer animate-pulse' : 'bg-surface-container-lowest p-space-base rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer'} onClick={() => alertsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                <div className="flex items-start justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Inventory Risk</span>
                  <div className="w-8 h-8 rounded-lg bg-error-container/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                  </div>
                </div>
                <div className="mt-space-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-metric-currency text-metric-currency text-on-surface">{atRisk === null ? '—' : formatQty(atRisk)}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">at risk</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-surface-container-high text-on-surface">{metric(summary?.lowStock)} Low</span>
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-error-container text-on-error-container">{metric(summary?.outOfStock)} Depleted</span>
                  </div>
                </div>
              </div>
              {/* Cards 3–5: Pending Receipts / Pending Deliveries / Transfers */}
              {KPI_FILTER_CARDS.map((card) => (
                <div className={isLoadingSummary && !summary ? 'bg-surface-container-lowest p-space-base rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer group animate-pulse' : 'bg-surface-container-lowest p-space-base rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer group'} key={card.type} onClick={() => filterByType(card.type)}>
                  <div className="flex items-start justify-between">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{card.label}</span>
                    <div className={card.iconBoxClassName}>
                      <span className={card.iconClassName}>{card.icon}</span>
                    </div>
                  </div>
                  <div className="mt-space-sm">
                    <div className="font-metric-currency text-metric-currency text-on-surface">{metric(summary?.[card.valueKey])}</div>
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
                  <input className="w-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm pl-9 pr-8 py-2 rounded-xl outline-none focus:bg-surface-container transition-all" id="tableSearchInput" onChange={(e) => updateFilter(() => setSearch(e.target.value))} placeholder="Search by document, product, or SKU..." type="text" value={search} />
                  <button className={search.length === 0 ? 'hidden absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface' : 'absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface'} id="clearSearchBtn" onClick={() => updateFilter(() => setSearch(''))} type="button">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
                {/* Filter Selects */}
                <div className="flex flex-wrap items-center gap-space-sm">
                  {/* Document Type Segmented Tabs */}
                  <div className="flex items-center p-1 bg-surface-container-low rounded-xl gap-0.5 text-label-sm font-label-sm" id="typeTabs">
                    {TYPE_FILTERS.map((filter) => (
                      <button className={filter.type === activeType ? TYPE_BTN_ACTIVE : TYPE_BTN_INACTIVE} data-type={filter.type} key={filter.type} onClick={() => updateFilter(() => setActiveType(filter.type))} type="button">
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  {/* Status Dropdown */}
                  <select className={FILTER_SELECT} id="statusFilter" onChange={(e) => updateFilter(() => setStatus(e.target.value as DocumentStatus | ''))} value={status}>
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {DOCUMENT_STATUS_LABEL[value]}
                      </option>
                    ))}
                  </select>
                  {/* Warehouse / Location */}
                  <select className={FILTER_SELECT} id="locationFilter" onChange={(e) => updateFilter(() => setPlace(e.target.value))} value={place}>
                    <option value="">All Locations</option>
                    {warehouses.map((warehouse) => (
                      <optgroup key={warehouse.id} label={`${warehouse.name} (${warehouse.code})`}>
                        <option value={`wh:${warehouse.id}`}>All of {warehouse.name}</option>
                        {warehouse.locations.map((loc) => (
                          <option key={loc.id} value={`loc:${loc.id}`}>
                            {warehouse.code} / {loc.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {/* Category */}
                  <select className={FILTER_SELECT} id="categoryFilter" onChange={(e) => updateFilter(() => setCategory(e.target.value))} value={category}>
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {/* Date Range */}
                  <select aria-label="Date range" className={FILTER_SELECT} id="dateFilter" onChange={(e) => updateFilter(() => applyDatePreset(e.target.value as DatePreset))} value={datePreset}>
                    {DATE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {/* Clear Filters */}
                  <button className="p-1.5 rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-all" id="resetFiltersBtn" onClick={resetAll} title="Reset All Filters" type="button">
                    <span className="material-symbols-outlined text-[20px]">filter_alt_off</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Operations Ledger Table Section */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col scroll-mt-20" ref={ledgerRef}>
              {/* Table Header Bar */}
              <div className="p-space-base flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs bg-surface-container-lowest">
                <div className="flex items-center gap-space-sm">
                  <span className="font-headline-sm text-headline-sm text-on-surface">Operations Ledger</span>
                  <span className="font-metric-tabular-sm text-metric-tabular-sm px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-medium" id="operationsCountBadge">
                    {isLoadingOperations ? 'Loading...' : `Showing ${rows.length} of ${formatQty(total)}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Sort by: Date (Newest)</span>
                </div>
              </div>
              {/* Responsive Data Table */}
              <div className="overflow-x-auto w-full">
                <table className={showTable ? 'w-full text-left border-collapse' : 'w-full text-left border-collapse hidden'} id="operationsTable">
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
                    {rows.map((op, index) => (
                      <tr className="op-row hover:bg-surface-container-low/60 transition-colors cursor-pointer" key={`${op.documentType}-${op.documentId}-${op.product.id}-${index}`} onClick={() => navigate(operationPath(op))}>
                        <td className="py-3 px-4 font-metric-tabular-sm text-metric-tabular-sm font-semibold text-primary">{op.reference}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface font-medium">
                            <span className={OPERATION_TYPE_ICON[op.documentType].className}>{OPERATION_TYPE_ICON[op.documentType].icon}</span> {OPERATION_TYPE_LABEL[op.documentType]}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-on-surface">{op.product.name}</div>
                          <div className="font-label-sm text-label-sm text-on-surface-variant">
                            <span className="font-mono">{op.product.sku}</span> · {op.category.name}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant">
                          <div>{operationLocation(op)}</div>
                          {op.partner && <div className="font-label-sm text-label-sm">{op.partner}</div>}
                        </td>
                        <td className={op.quantity < 0 ? QTY_NEGATIVE_CLASS : QTY_CLASS}>{operationQuantity(op)}</td>
                        <td className="py-3 px-4">
                          <span className={OPERATION_STATUS_CLASS[op.status]}>{DOCUMENT_STATUS_LABEL[op.status]}</span>
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant font-label-sm text-label-sm">{formatTimestamp(op.createdAt)}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold transition-all"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(operationPath(op))
                            }}
                            type="button"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Loading State */}
              {isLoadingOperations && (
                <div className={STATE_BOX}>
                  <div className={`${STATE_ICON} animate-pulse`}>
                    <span className="material-symbols-outlined text-[28px]">hourglass_empty</span>
                  </div>
                  <div className="font-headline-sm text-headline-sm text-on-surface">Loading operations...</div>
                </div>
              )}
              {/* Error State */}
              {!isLoadingOperations && operationsError && (
                <div className={STATE_BOX}>
                  <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center text-on-error-container">
                    <span className="material-symbols-outlined text-[28px]">error</span>
                  </div>
                  <div className="font-headline-sm text-headline-sm text-on-surface">Could not load operations</div>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">{operationsError}</p>
                  <button className={STATE_BTN} onClick={refresh} type="button">
                    Try Again
                  </button>
                </div>
              )}
              {/* Empty State UI */}
              {!isLoadingOperations && !operationsError && rows.length === 0 && (
                <div className={STATE_BOX} id="noResultsState">
                  <div className={STATE_ICON}>
                    <span className="material-symbols-outlined text-[28px]">{hasFilters ? 'search_off' : 'inventory'}</span>
                  </div>
                  <div className="font-headline-sm text-headline-sm text-on-surface">{hasFilters ? 'No inventory operations found' : 'No inventory operations yet'}</div>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                    {hasFilters ? 'No operation matches the current search query and filter criteria.' : 'Receipts, deliveries, transfers and adjustments will appear here once they are created.'}
                  </p>
                  {hasFilters ? (
                    <button className={STATE_BTN} id="emptyClearBtn" onClick={resetAll} type="button">
                      Clear Filters
                    </button>
                  ) : (
                    <button className={STATE_BTN} onClick={() => setIsModalOpen(true)} type="button">
                      New Operation
                    </button>
                  )}
                </div>
              )}
              {/* Pagination / Footer Bar */}
              <div className="p-space-base bg-surface-container-low/40 flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Page {page} of {totalPages} ({formatQty(total)} {total === 1 ? 'record' : 'records'} total)
                </span>
                <div className="flex items-center gap-space-xs">
                  <button className={page <= 1 || isLoadingOperations ? PAGER_BTN_DISABLED : PAGER_BTN} disabled={page <= 1 || isLoadingOperations} onClick={() => setPage((p) => Math.max(1, p - 1))} type="button">
                    Previous
                  </button>
                  <span className="px-3 py-1 font-metric-tabular-sm text-metric-tabular-sm font-medium text-on-surface">{page}</span>
                  <button className={page >= totalPages || isLoadingOperations ? PAGER_BTN_DISABLED : PAGER_BTN} disabled={page >= totalPages || isLoadingOperations} onClick={() => setPage((p) => p + 1)} type="button">
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Low Stock Alert Section (Severity Strip Layout) */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-base md:p-space-lg space-y-space-base scroll-mt-20" ref={alertsRef}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
                <div className="flex items-center gap-space-sm">
                  <div className={alertTotal > 0 ? 'w-2.5 h-2.5 rounded-full bg-error animate-pulse' : 'w-2.5 h-2.5 rounded-full bg-secondary'} />
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Low Stock Items</h2>
                  {!isLoadingAlerts && !alertsError && alertTotal > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
                      Action required: {formatQty(alertTotal)} {alertTotal === 1 ? 'item' : 'items'} at or below reorder level
                    </span>
                  )}
                </div>
                <button className="font-label-sm text-label-sm text-primary font-medium hover:underline" onClick={() => navigate(ROUTES.products)} type="button">
                  View all products →
                </button>
              </div>
              {isLoadingAlerts && !alerts && <p className="font-body-md text-body-md text-on-surface-variant animate-pulse">Loading stock alerts...</p>}
              {!isLoadingAlerts && alertsError && (
                <div className="flex items-center justify-between gap-space-sm bg-error-container text-on-error-container p-space-md rounded-xl font-body-sm text-body-sm">
                  <span>{alertsError}</span>
                  <button className="font-label-md text-label-md font-semibold underline" onClick={refresh} type="button">
                    Retry
                  </button>
                </div>
              )}
              {!isLoadingAlerts && !alertsError && alerts?.length === 0 && (
                <div className="flex items-center gap-space-sm bg-surface-container-low rounded-xl p-space-base text-on-surface-variant font-body-md text-body-md">
                  <span className="material-symbols-outlined text-[20px] text-secondary">check_circle</span>
                  No products are low on stock or out of stock.
                </div>
              )}
              {/* Critical Item Cards Grid */}
              {!alertsError && alerts && alerts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-base">
                  {alerts.map((alert) => {
                    const tone = alertTone(alert)
                    const uom = alert.product.unitOfMeasure
                    return (
                      <div className="relative bg-surface-container-low rounded-xl p-space-base flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md transition-shadow" key={alert.product.id}>
                        <div className={ALERT_STRIP[tone]} />
                        <div className="pl-2 space-y-space-xxs">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">{alert.product.sku}</span>
                              <h3 className="font-headline-sm text-headline-sm text-on-surface">{alert.product.name}</h3>
                            </div>
                            <span className={ALERT_BADGE[tone]}>{tone === 'out' ? 'Out of Stock' : 'Low'}</span>
                          </div>
                          <div className="pt-space-xs text-on-surface-variant font-body-sm text-body-sm">
                            <div>Category: <span className="text-on-surface font-medium">{alert.category.name}</span></div>
                            <div className="flex items-center justify-between mt-1">
                              <span>Stock: <strong className={ALERT_STOCK[tone]}>{formatQty(alert.quantity)} {uom}</strong></span>
                              <span>Reorder at: <strong className="text-on-surface font-mono">{formatQty(alert.reorderLevel)} {uom}</strong></span>
                            </div>
                          </div>
                        </div>
                        <div className="pl-2 pt-space-base mt-2">
                          <button className={ALERT_ACTION[tone]} onClick={() => navigate(productDetailPath(alert.product.id))} type="button">
                            View Product
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <DashboardDock summary={summary} />
          <NewOperationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
      </main>
      <DashboardFooter latencyMs={latencyMs} summary={summary} syncedAt={syncedAt} syncState={syncState} />
    </div>
  )
}
