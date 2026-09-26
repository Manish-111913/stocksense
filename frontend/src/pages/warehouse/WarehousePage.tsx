import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Paginated, RecordStatus, Warehouse, WarehouseLocation, WarehouseSummary } from '../../api/types.ts'
import { getWarehouse, getWarehouseSummary, listWarehouses, setLocationStatus, setWarehouseStatus } from '../../api/warehouses.ts'
import { useCurrentUser } from '../../auth/useAuth.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { usePageChrome } from '../../hooks/usePageChrome.ts'
import { ROUTES } from '../../routes.ts'
import { useDebouncedValue } from '../products/productsData.ts'
import { downloadNetworkCsv, errorMessage, PAGE_SIZE, plural, type ToastTone } from './data.ts'
import { InspectorDrawer } from './InspectorDrawer.tsx'
import { LocationFormModal } from './LocationFormModal.tsx'
import { WarehouseFormModal } from './WarehouseFormModal.tsx'
import { WarehouseHeader } from './WarehouseHeader.tsx'

const ROW_PRIMARY = 'hover:bg-indigo-50/40 bg-indigo-50/20 transition-colors cursor-pointer group'
const ROW = 'hover:bg-slate-50/80 transition-colors cursor-pointer group'
const ROW_SELECTED = 'bg-indigo-50/60 transition-colors cursor-pointer group'
const INSPECT_PRIMARY = 'px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-2xs'
const INSPECT = 'px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors'
const FILTER_BTN = 'px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5'
const FILTER_PILL = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200 text-[11px]'
const LOCATION_TAG = 'px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-700'
const PAGER_ARROW = 'p-1 rounded bg-white border border-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-40'
const PAGER_PAGE = 'w-6 h-6 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 font-semibold text-xs flex items-center justify-center'
const PAGER_PAGE_ACTIVE = 'w-6 h-6 rounded bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center shadow-2xs'
const ICON_PRIMARY = 'w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs'
const ICON_ACTIVE = 'w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 border border-blue-100'
const ICON_INACTIVE = 'w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200'
const ROW_ICON_BTN = 'p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40'
const EMPTY_BTN = 'mt-4 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs inline-flex items-center gap-1.5 transition-all'
const TABLE_COLUMNS = 5
const MAX_TAGS = 3

type ToastState = { title: string; subtitle: string; tone: ToastTone }

function facilities(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? 'Facility' : 'Facilities'}`
}

/** Up to 5 page numbers centred on the current page */
function pageWindow(page: number, totalPages: number) {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export default function WarehousePage() {
  useDocumentTitle('StockSense — Warehouse Management & Locations')
  usePageChrome('bg-slate-100/80 text-slate-900 pt-3 sm:pt-4 px-3 sm:px-4 pb-4 min-h-screen flex flex-col justify-between selection:bg-indigo-500 selection:text-white', 'ss-ledger')
  const navigate = useNavigate()
  const isManager = useCurrentUser()?.role === 'INVENTORY_MANAGER'

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [statusFilter, setStatusFilter] = useState<RecordStatus | ''>('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [result, setResult] = useState<Paginated<Warehouse> | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  // Key of the last request that settled; anything else means a request is in flight
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const [summary, setSummary] = useState<WarehouseSummary | null>(null)
  const [summaryFailed, setSummaryFailed] = useState(false)

  const [selected, setSelected] = useState<Warehouse | null>(null)
  const [warehouseForm, setWarehouseForm] = useState<{ warehouse: Warehouse | null } | null>(null)
  const [locationForm, setLocationForm] = useState<{ location: WarehouseLocation | null } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const searchInput = useRef<HTMLInputElement>(null)

  const filters = useMemo(() => ({ search: debouncedSearch || undefined, status: statusFilter || undefined }), [debouncedSearch, statusFilter])
  const hasFilters = Boolean(filters.search || filters.status)
  const requestKey = `${JSON.stringify(filters)}|${page}|${reloadKey}`
  const isLoading = settledKey !== requestKey
  const loadError = isLoading ? null : fetchError
  const rows = result?.data ?? []
  const pagination = result?.pagination
  const topWarehouse = summary?.topWarehouse ?? null

  const showToast = useCallback((title: string, subtitle: string, tone: ToastTone = 'success') => {
    setToast({ title, subtitle, tone })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), tone === 'error' ? 5000 : 3800)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  // ⌘F / Ctrl+F focuses the warehouse search
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f' && searchInput.current) {
        event.preventDefault()
        searchInput.current.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Warehouse page for the current filters
  useEffect(() => {
    let cancelled = false
    listWarehouses({ ...filters, page, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return
        // The page emptied (e.g. after a filter change): step back to the last page
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
        setFetchError(errorMessage(err, 'Could not load warehouses. Please try again.'))
        setSettledKey(requestKey)
      })
    return () => {
      cancelled = true
    }
  }, [filters, page, requestKey])

  // KPI cards
  useEffect(() => {
    let cancelled = false
    getWarehouseSummary()
      .then((res) => {
        if (cancelled) return
        setSummary(res)
        setSummaryFailed(false)
      })
      .catch(() => {
        if (!cancelled) setSummaryFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  function refresh() {
    setReloadKey((key) => key + 1)
  }

  /** Reloads the table, KPIs and the open inspector after a write */
  function afterWrite(warehouseId?: string) {
    refresh()
    const id = warehouseId ?? selected?.id
    if (!id) return
    getWarehouse(id)
      .then((fresh) => setSelected((current) => (current?.id === fresh.id ? fresh : current)))
      .catch(() => {})
  }

  function changeSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function changeStatus(value: RecordStatus | '') {
    setStatusFilter(value)
    setPage(1)
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('')
    setPage(1)
  }

  function inspect(warehouse: Warehouse) {
    setSelected(warehouse)
  }

  function inspectTopWarehouse() {
    if (!topWarehouse) return
    const row = rows.find((item) => item.id === topWarehouse.id)
    if (row) {
      setSelected(row)
      return
    }
    getWarehouse(topWarehouse.id)
      .then(setSelected)
      .catch((err: unknown) => showToast('Could not open warehouse', errorMessage(err, 'Please try again.'), 'error'))
  }

  function openAddWarehouse() {
    setWarehouseForm({ warehouse: null })
  }

  function handleWarehouseSaved(warehouse: Warehouse, created: boolean) {
    setWarehouseForm(null)
    showToast(created ? 'Warehouse created' : 'Warehouse updated', `${warehouse.name} (${warehouse.code}) ${created ? 'is ready for locations.' : 'has been saved.'}`)
    if (created) setSelected(warehouse)
    afterWrite(warehouse.id)
  }

  async function toggleWarehouse(warehouse: Warehouse) {
    const next: RecordStatus = warehouse.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setBusyId(warehouse.id)
    try {
      await setWarehouseStatus(warehouse.id, next)
      showToast(next === 'ACTIVE' ? 'Warehouse activated' : 'Warehouse deactivated', `${warehouse.name} (${warehouse.code}) is now ${next === 'ACTIVE' ? 'active' : 'inactive'}.`)
      afterWrite(warehouse.id)
    } catch (err) {
      showToast(`Could not ${next === 'ACTIVE' ? 'activate' : 'deactivate'} ${warehouse.code}`, errorMessage(err, 'Please try again.'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleLocation(location: WarehouseLocation) {
    const next: RecordStatus = location.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setBusyId(location.id)
    try {
      await setLocationStatus(location.id, next)
      showToast(next === 'ACTIVE' ? 'Location activated' : 'Location deactivated', `${location.name} (${location.code}) is now ${next === 'ACTIVE' ? 'active' : 'inactive'}.`)
      afterWrite()
    } catch (err) {
      showToast(`Could not ${next === 'ACTIVE' ? 'activate' : 'deactivate'} ${location.code}`, errorMessage(err, 'Please try again.'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  function handleLocationSaved(created: boolean, name: string, code: string) {
    setLocationForm(null)
    showToast(created ? 'Location added' : 'Location updated', `${name} (${code}) ${created ? `added to ${selected?.code ?? 'the warehouse'}.` : 'has been saved.'}`)
    afterWrite()
  }

  async function handleExport() {
    setIsExporting(true)
    try {
      const all: Warehouse[] = []
      let exportPage = 1
      let totalPages = 1
      do {
        const res = await listWarehouses({ ...filters, page: exportPage, limit: 100 })
        all.push(...res.data)
        totalPages = res.pagination.totalPages
        exportPage += 1
      } while (exportPage <= totalPages)
      if (all.length === 0) {
        showToast('Nothing to export', hasFilters ? 'No warehouses match the current filters.' : 'Add a warehouse first.', 'error')
        return
      }
      downloadNetworkCsv(all)
      showToast('Export ready', `${plural(all.length, 'warehouse')} with their locations saved as CSV.`)
    } catch (err) {
      showToast('Export failed', errorMessage(err, 'Could not export warehouses. Please try again.'), 'error')
    } finally {
      setIsExporting(false)
    }
  }

  function renderTableState() {
    if (loadError) {
      return (
        <tr>
          <td className="py-14 px-4 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">error</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">Couldn&apos;t load warehouses</p>
            <p className="text-xs text-slate-500 mt-1">{loadError}</p>
            <button className={EMPTY_BTN} onClick={refresh} type="button">
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
            Loading warehouses...
          </td>
        </tr>
      )
    }
    if (rows.length === 0) {
      return (
        <tr>
          <td className="py-14 px-4 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">{hasFilters ? 'search_off' : 'warehouse'}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{hasFilters ? 'No warehouses match your filters' : 'No warehouses yet'}</p>
            <p className="text-xs text-slate-500 mt-1">
              {hasFilters ? 'Try a different search term or clear the filters.' : isManager ? 'Add your first warehouse, then create the locations that hold its stock.' : 'An inventory manager needs to add the first warehouse.'}
            </p>
            {hasFilters ? (
              <button className={EMPTY_BTN} onClick={clearFilters} type="button">
                <span className="material-symbols-outlined text-[16px] text-slate-500">restart_alt</span>
                <span>Clear Filters</span>
              </button>
            ) : (
              isManager && (
                <button className="mt-4 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-600/20 transition-all inline-flex items-center gap-1.5" onClick={openAddWarehouse} type="button">
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add Warehouse
                </button>
              )
            )}
          </td>
        </tr>
      )
    }
    return rows.map((row) => {
      const isTop = topWarehouse?.id === row.id
      const isActive = row.status === 'ACTIVE'
      const extraTags = row.locations.length - MAX_TAGS
      return (
        <tr className={selected?.id === row.id ? ROW_SELECTED : isTop ? ROW_PRIMARY : ROW} key={row.id} onClick={() => inspect(row)}>
          <td className="py-3.5 px-4">
            <div className="flex items-start gap-3">
              <div className={isTop ? ICON_PRIMARY : isActive ? ICON_ACTIVE : ICON_INACTIVE}>
                <span className="material-symbols-outlined text-[18px]">{isTop ? 'warehouse' : 'domain'}</span>
              </div>
              <div className="min-w-0">
                {isTop ? (
                  <div className="font-semibold text-indigo-700 flex items-center gap-1.5">
                    {row.name}
                    <span className="material-symbols-outlined text-[14px] text-amber-500" title="Primary hub (most SKUs stored)">star</span>
                  </div>
                ) : (
                  <div className={isActive ? 'font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors' : 'font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors'}>
                    {row.name}
                  </div>
                )}
                <div className="font-mono text-[11px] text-slate-500">{row.code}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 max-w-[320px] truncate" title={row.description ?? undefined}>{row.description || 'No address or notes'}</div>
              </div>
            </div>
          </td>
          <td className="py-3.5 px-4">
            <div className="font-semibold text-slate-900 mb-1">
              {row.locationCount === 0 ? 'No locations yet' : `${plural(row.locationCount, 'Location')} · ${row.activeLocationCount} active`}
            </div>
            {row.locations.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {row.locations.slice(0, MAX_TAGS).map((location) => (
                  <span className={location.status === 'ACTIVE' ? LOCATION_TAG : `${LOCATION_TAG} opacity-60 line-through`} key={location.id} title={`${location.code}${location.status === 'ACTIVE' ? '' : ' (inactive)'}`}>{location.name}</span>
                ))}
                {extraTags > 0 && <span className="px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{`+${extraTags} more`}</span>}
              </div>
            )}
          </td>
          <td className="py-3.5 px-4 whitespace-nowrap">
            <div className="font-mono font-bold text-slate-900 text-xs">{plural(row.productCount, 'SKU')}</div>
            <div className="text-[11px] text-slate-500 max-w-[150px] truncate">{row.productCount === 0 ? 'No stock yet' : 'Distinct products stored'}</div>
          </td>
          <td className="py-3.5 px-4 whitespace-nowrap">
            {isActive ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Inactive
              </span>
            )}
          </td>
          <td className="py-3.5 px-4 whitespace-nowrap text-right">
            <div className="flex items-center justify-end gap-1.5">
              <button
                className={isTop ? INSPECT_PRIMARY : INSPECT}
                onClick={(e) => {
                  e.stopPropagation()
                  inspect(row)
                }}
                type="button"
              >
                Inspect
              </button>
              {isManager && (
                <>
                  <button
                    className={ROW_ICON_BTN}
                    onClick={(e) => {
                      e.stopPropagation()
                      setWarehouseForm({ warehouse: row })
                    }}
                    title="Edit Facility"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[17px]">edit</span>
                  </button>
                  <button
                    className={ROW_ICON_BTN}
                    disabled={busyId === row.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      void toggleWarehouse(row)
                    }}
                    title={isActive ? 'Deactivate Facility' : 'Activate Facility'}
                    type="button"
                  >
                    <span className={busyId === row.id ? 'material-symbols-outlined text-[17px] animate-spin' : isActive ? 'material-symbols-outlined text-[17px] text-emerald-600' : 'material-symbols-outlined text-[17px]'}>
                      {busyId === row.id ? 'progress_activity' : isActive ? 'toggle_on' : 'toggle_off'}
                    </span>
                  </button>
                </>
              )}
            </div>
          </td>
        </tr>
      )
    })
  }

  const rangeStart = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0
  const rangeEnd = rows.length > 0 ? rangeStart + rows.length - 1 : 0
  const totalPages = pagination?.totalPages ?? 0
  const healthPct = summary && summary.totalWarehouses > 0 ? Math.round((summary.activeWarehouses / summary.totalWarehouses) * 100) : null
  const kpiSub = summaryFailed && !summary ? 'Couldn’t load summary' : 'Loading...'

  // Desktop App Window Shell Container
  return (
    <div className="w-full mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/90 flex flex-col flex-1 overflow-hidden relative">
      <WarehouseHeader />
      {/* Main Scrollable Body Content */}
      <main className="flex-1 p-5 md:p-6 bg-slate-50/50 overflow-y-auto pb-32 md:pb-32">
        {/* Breadcrumbs & Operations Sub-Header */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => navigate(ROUTES.dashboard)}>Operations</span>
            <span className="text-slate-400">/</span>
            <span className="hover:text-slate-800 cursor-pointer" onClick={clearFilters}>Warehouses</span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-display font-extrabold text-slate-900 tracking-tight">Warehouses &amp; Locations</h1>
                {summary && summary.activeWarehouses > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {`${summary.activeWarehouses} Active`}
                  </span>
                )}
                {summary && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono text-xs font-semibold">
                    {`${facilities(summary.totalWarehouses)} · ${plural(summary.totalLocations, 'Location')}`}
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Manage physical warehouse infrastructure, internal staging zones, storage racks, and operational bin locations.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
              <button className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-60" disabled={isExporting} onClick={() => void handleExport()} type="button">
                <span className={isExporting ? 'material-symbols-outlined text-[16px] text-slate-500 animate-spin' : 'material-symbols-outlined text-[16px] text-slate-500'}>{isExporting ? 'progress_activity' : 'download'}</span>
                {isExporting ? 'Exporting...' : 'Export Network CSV'}
              </button>
              {isManager && (
                <button className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5" onClick={openAddWarehouse} type="button">
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add Warehouse
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Screen Mode Preview Banner */}
        <div className="mb-5 p-3 px-4 rounded-xl bg-indigo-50/70 border border-indigo-100/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700">
            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <span className="material-symbols-outlined text-[15px]">share_location</span>
            </span>
            <span>
              <strong className="font-semibold text-indigo-900">Network Overview:</strong> Each warehouse holds its own storage locations; stock is always tracked per location.
            </span>
          </div>
          {topWarehouse && (
            <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
              <button className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-colors flex items-center gap-1" onClick={inspectTopWarehouse} type="button">
                <span className="material-symbols-outlined text-[13px]">visibility</span>
                {`Inspect #${topWarehouse.code} (${topWarehouse.name})`}
              </button>
            </div>
          )}
        </div>
        {/* 5 KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-5">
          {/* KPI 1 */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Facilities</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">domain</span>
              </div>
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-slate-900 tracking-tight">{summary ? summary.totalWarehouses.toLocaleString() : '—'}</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                {summary ? `${summary.activeWarehouses.toLocaleString()} active · ${(summary.totalWarehouses - summary.activeWarehouses).toLocaleString()} inactive` : kpiSub}
              </div>
            </div>
          </div>
          {/* KPI 2 */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Storage Locations</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">shelves</span>
              </div>
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-emerald-600 tracking-tight">{summary ? summary.totalLocations.toLocaleString() : '—'}</div>
              <div className="text-xs text-slate-500 mt-1">{summary ? `${summary.activeLocations.toLocaleString()} active across all facilities` : kpiSub}</div>
            </div>
          </div>
          {/* KPI 3 */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Stored SKUs</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              </div>
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-slate-900 tracking-tight">{summary ? summary.storedProducts.toLocaleString() : '—'} <span className="text-xs font-sans font-normal text-slate-500">SKUs</span></div>
              <div className="text-xs text-slate-500 mt-1">{summary ? (summary.storedProducts === 0 ? 'No stock yet' : 'Distinct products in stock') : kpiSub}</div>
            </div>
          </div>
          {/* KPI 4: Highlighted Primary Hub Card with Indigo Accent Border */}
          <div className="bg-gradient-to-b from-indigo-50/50 to-white rounded-xl p-4 border-2 border-indigo-500 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Primary Hub</span>
              {topWarehouse && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  Most Stock
                </span>
              )}
            </div>
            {topWarehouse ? (
              <button className="text-left" onClick={inspectTopWarehouse} type="button">
                <div className="text-base font-display font-bold text-indigo-600 truncate">{topWarehouse.name}</div>
                <div className="text-xs text-indigo-900/70 font-medium mt-1 truncate">{`${topWarehouse.code} · ${plural(topWarehouse.productCount, 'SKU')} stored`}</div>
              </button>
            ) : (
              <div>
                <div className="text-base font-display font-bold text-indigo-600 truncate">—</div>
                <div className="text-xs text-indigo-900/70 font-medium mt-1">{summary ? 'No stock yet' : kpiSub}</div>
              </div>
            )}
          </div>
          {/* KPI 5 */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Network Health</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-emerald-600 tracking-tight">{healthPct === null ? '—' : `${healthPct}%`}</div>
              <div className="text-xs text-slate-500 mt-1">
                {!summary ? kpiSub : summary.totalWarehouses === 0 ? 'No facilities yet' : healthPct === 100 ? 'All facilities active' : `${summary.activeWarehouses} of ${facilities(summary.totalWarehouses).toLowerCase()} active`}
              </div>
            </div>
          </div>
        </div>
        {/* Filter & Search Controls Bar */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs mb-5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Main Search Input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
              <input className="w-full pl-9 pr-14 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" id="warehouseSearchInput" maxLength={150} onChange={(e) => changeSearch(e.target.value)} placeholder="Search warehouses by name or code..." ref={searchInput} type="text" value={search} />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">⌘F</kbd>
            </div>
            {/* Dropdown Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <label className={FILTER_BTN} htmlFor="warehouseStatusFilter">
                <span>Facility Status:</span>
                <select className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer" id="warehouseStatusFilter" onChange={(e) => changeStatus(e.target.value as RecordStatus | '')} value={statusFilter}>
                  <option value="">{summary ? `All (${summary.totalWarehouses})` : 'All'}</option>
                  <option value="ACTIVE">{summary ? `Active (${summary.activeWarehouses})` : 'Active'}</option>
                  <option value="INACTIVE">{summary ? `Inactive (${summary.totalWarehouses - summary.activeWarehouses})` : 'Inactive'}</option>
                </select>
              </label>
              <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors" onClick={clearFilters} title="Reset Filters" type="button">
                <span className="material-symbols-outlined text-[17px]">restart_alt</span>
              </button>
            </div>
          </div>
          {/* Active Filter Pills & Results Count */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {!hasFilters && <span className="text-[11px] text-slate-400">No filters applied</span>}
              {filters.search && (
                <span className={FILTER_PILL}>
                  {`Search: “${filters.search}”`}
                  <button className="material-symbols-outlined text-[13px] text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => changeSearch('')} title="Clear search" type="button">close</button>
                </span>
              )}
              {filters.status && (
                <span className={FILTER_PILL}>
                  {`Status: ${filters.status === 'ACTIVE' ? 'Active' : 'Inactive'}`}
                  <button className="material-symbols-outlined text-[13px] text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => changeStatus('')} title="Clear status filter" type="button">close</button>
                </span>
              )}
            </div>
            <div className="text-slate-500 font-mono text-[11px]">
              {pagination ? (
                <>
                  Showing <strong className="text-slate-900 font-semibold font-sans">{rows.length}</strong> of {pagination.total.toLocaleString()} {pagination.total === 1 ? 'warehouse' : 'warehouses'}
                </>
              ) : (
                'Loading warehouses...'
              )}
            </div>
          </div>
        </div>
        {/* Warehouse table (the inspector opens as a panel over the page) */}
        <div className="flex flex-col xl:flex-row gap-5 items-start">
          {/* Left: Warehouse Directory Table Container */}
          <div className="w-full flex-1 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[19px]">account_tree</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Warehouse Directory &amp; Locations</h2>
                  <p className="text-xs text-slate-500">Parent facilities containing segregated sub-bins, racks, and picking aisles.</p>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-3">
                <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-600" /> Primary Hub</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Active</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Inactive</span>
                </div>
              </div>
            </div>
            {/* Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Warehouse &amp; Code</th>
                    <th className="py-3 px-4">Locations</th>
                    <th className="py-3 px-4">Stored SKUs</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={isLoading && rows.length > 0 ? 'divide-y divide-slate-100 text-slate-700 opacity-60 transition-opacity' : 'divide-y divide-slate-100 text-slate-700'}>
                  {renderTableState()}
                </tbody>
              </table>
            </div>
            {/* Table Footer & Security Statement */}
            <div className="p-3.5 px-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="material-symbols-outlined text-[17px] text-indigo-600">security</span>
                <span>Every location belongs to exactly one warehouse; locations holding stock cannot be deactivated.</span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-slate-500 font-mono text-[11px]">
                  {pagination ? `Showing ${rangeStart}-${rangeEnd} of ${pagination.total.toLocaleString()} ${pagination.total === 1 ? 'warehouse' : 'warehouses'}` : 'Loading...'}
                </span>
                <div className="flex items-center gap-1">
                  <button className={PAGER_ARROW} disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))} title="Previous page" type="button">
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  {pageWindow(page, Math.max(totalPages, 1)).map((n) => (
                    <button className={n === page ? PAGER_PAGE_ACTIVE : PAGER_PAGE} disabled={n > Math.max(totalPages, 1)} key={n} onClick={() => setPage(n)} type="button">{n}</button>
                  ))}
                  <button className={PAGER_ARROW} disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => p + 1)} title="Next page" type="button">
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {selected && (
            <InspectorDrawer
              busyId={busyId}
              isManager={isManager}
              isTopWarehouse={topWarehouse?.id === selected.id}
              onAddLocation={() => setLocationForm({ location: null })}
              onClose={() => setSelected(null)}
              onEdit={() => setWarehouseForm({ warehouse: selected })}
              onEditLocation={(location) => setLocationForm({ location })}
              onToggleLocation={(location) => void toggleLocation(location)}
              onToggleStatus={() => void toggleWarehouse(selected)}
              warehouse={selected}
            />
          )}
        </div>
      </main>
      {/* Bottom System Telemetry Status Bar */}
      {/* Notification Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700/80 transition-all duration-300 max-w-sm" id="toastSuccess" role="status">
          <div className={toast.tone === 'error' ? 'w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0' : 'w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0'}>
            <span className="material-symbols-outlined text-[17px]">{toast.tone === 'error' ? 'error' : 'check_circle'}</span>
          </div>
          <div>
            <div className="text-xs font-semibold">{toast.title}</div>
            <div className="text-[11px] text-slate-400">{toast.subtitle}</div>
          </div>
        </div>
      )}
      {warehouseForm && <WarehouseFormModal onClose={() => setWarehouseForm(null)} onSaved={handleWarehouseSaved} warehouse={warehouseForm.warehouse} />}
      {locationForm && selected && (
        <LocationFormModal
          location={locationForm.location}
          onClose={() => setLocationForm(null)}
          onSaved={(location, created) => handleLocationSaved(created, location.name, location.code)}
          warehouse={selected}
        />
      )}
    </div>
  )
}
