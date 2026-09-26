import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { exportLedgerCsv, getLedgerSummary, listLedger, type LedgerFilters } from '../../api/ledger.ts'
import type { LedgerEntry, LedgerSummary, Location, MovementType, Paginated, Warehouse } from '../../api/types.ts'
import { listLocations, listWarehouses } from '../../api/warehouses.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { usePageChrome } from '../../hooks/usePageChrome.ts'
import { ROUTES } from '../../routes.ts'
import { errorMessage, formatQty, useDebouncedValue } from '../products/productsData.ts'
import { DATE_OPTIONS, dateRangeFor, MOVEMENT_BADGES, MOVEMENT_OPTIONS, MOVEMENT_TYPES, pageList, type DatePreset, type SelectOption } from './data.ts'
import { InspectorDrawer } from './InspectorDrawer.tsx'
import { KpiCards } from './KpiCards.tsx'
import { LedgerDock } from './LedgerDock.tsx'
import { LedgerFilterSelect } from './LedgerFilterSelect.tsx'
import { LedgerFooter } from './LedgerFooter.tsx'
import { LedgerHeader } from './LedgerHeader.tsx'
import { LedgerRow } from './LedgerRow.tsx'

const PAGE_SIZE = 10
const TABLE_COLUMNS = 7

const PILL = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200 text-[11px]'
const PAGE_BUTTON = 'rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs flex items-center justify-center'
const PAGE_ACTIVE = 'rounded bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center shadow-2xs'

/** Newest ledger row + overall count (no filters) for the header badge and status bar */
interface LedgerOverview {
  total: number
  latestAt: string | null
}

export default function MoveHistoryPage() {
  const navigate = useNavigate()
  useDocumentTitle('StockSense — Stock Ledger & Move History')
  usePageChrome('bg-slate-100/80 text-slate-900 p-2 sm:p-4 min-h-screen flex flex-col justify-between selection:bg-indigo-500 selection:text-white', 'ss-ledger')

  const searchInputRef = useRef<HTMLInputElement>(null)
  const headerSearchRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [movementType, setMovementType] = useState<MovementType | ''>('')
  const [warehouseId, setWarehouseId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [result, setResult] = useState<Paginated<LedgerEntry> | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  // Key of the last request that settled; anything else means a request is in flight
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const [summary, setSummary] = useState<LedgerSummary | null>(null)
  const [overview, setOverview] = useState<LedgerOverview | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const [isDrawerOpen, setIsDrawerOpen] = useState(true)
  const [selected, setSelected] = useState<LedgerEntry | null>(null)

  const currentFilters = useMemo<LedgerFilters>(
    () => ({
      search: debouncedSearch || undefined,
      movementType: movementType || undefined,
      warehouseId: warehouseId || undefined,
      locationId: locationId || undefined,
      ...dateRangeFor(datePreset),
    }),
    [debouncedSearch, movementType, warehouseId, locationId, datePreset],
  )
  const hasFilters = Boolean(search.trim() || movementType || warehouseId || locationId || datePreset)
  const filtersKey = JSON.stringify(currentFilters)
  const requestKey = `${filtersKey}|${page}|${reloadKey}`
  const isLoading = settledKey !== requestKey
  const loadError = isLoading ? null : fetchError

  // Warehouse filter options
  useEffect(() => {
    listWarehouses({ limit: 100 })
      .then((res) => setWarehouses(res.data))
      .catch(() => setWarehouses([]))
  }, [])

  // Location filter options (scoped to the chosen warehouse)
  useEffect(() => {
    let cancelled = false
    listLocations({ warehouseId: warehouseId || undefined })
      .then((res) => {
        if (!cancelled) setLocations(res)
      })
      .catch(() => {
        if (!cancelled) setLocations([])
      })
    return () => {
      cancelled = true
    }
  }, [warehouseId])

  // Ledger page for the current filters (newest first)
  useEffect(() => {
    let cancelled = false
    listLedger({ ...currentFilters, page, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return
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
        setFetchError(errorMessage(err, 'Could not load the stock ledger. Please try again.'))
        setSettledKey(requestKey)
      })
    return () => {
      cancelled = true
    }
  }, [currentFilters, page, requestKey])

  // KPI cards for the current filters
  useEffect(() => {
    let cancelled = false
    getLedgerSummary(currentFilters)
      .then((res) => {
        if (!cancelled) setSummary(res)
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
    return () => {
      cancelled = true
    }
  }, [currentFilters, reloadKey])

  // Overall movement count + newest movement (unfiltered)
  useEffect(() => {
    let cancelled = false
    listLedger({ page: 1, limit: 1 })
      .then((res) => {
        if (!cancelled) setOverview({ total: res.pagination.total, latestAt: res.data[0]?.createdAt ?? null })
      })
      .catch(() => {
        if (!cancelled) setOverview(null)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // ⌘F / Ctrl+F focuses the ledger search, ⌘K / Ctrl+K the header search
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()
      if (key === 'f') {
        event.preventDefault()
        searchInputRef.current?.focus()
      } else if (key === 'k') {
        event.preventDefault()
        headerSearchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const refresh = useCallback(() => setReloadKey((key) => key + 1), [])

  function updateFilter(apply: () => void) {
    apply()
    setPage(1)
    setSelected(null)
  }

  function resetFilters() {
    updateFilter(() => {
      setSearch('')
      setMovementType('')
      setWarehouseId('')
      setLocationId('')
      setDatePreset('')
    })
  }

  function inspect(entry: LedgerEntry) {
    setSelected(entry)
    setIsDrawerOpen(true)
  }

  async function exportLedger() {
    setIsExporting(true)
    setExportError(null)
    try {
      await exportLedgerCsv(currentFilters)
    } catch (err) {
      setExportError(errorMessage(err, 'Could not export the stock ledger. Please try again.'))
    } finally {
      setIsExporting(false)
    }
  }

  const rows = result?.data ?? []
  const pagination = result?.pagination
  const totalPages = Math.max(1, pagination?.totalPages ?? 1)
  const shownPage = pagination?.page ?? page
  const firstShown = rows.length > 0 ? (shownPage - 1) * (pagination?.limit ?? PAGE_SIZE) + 1 : 0
  const lastShown = firstShown > 0 ? firstShown + rows.length - 1 : 0
  const inspected = selected ?? rows[0] ?? null

  const warehouseName = warehouses.find((w) => w.id === warehouseId)?.name
  const location = locations.find((l) => l.id === locationId)
  const locationName = location ? `${location.name} (${location.code})` : undefined
  const dateLabel = DATE_OPTIONS.find((o) => o.value === datePreset)?.label ?? 'All Time'
  const warehouseOptions: SelectOption[] = [{ value: '', label: 'All Warehouses' }, ...warehouses.map((w) => ({ value: w.id, label: w.status === 'ACTIVE' ? w.name : `${w.name} (inactive)` }))]
  const locationOptions: SelectOption[] = [
    { value: '', label: 'All Locations & Bins' },
    ...locations.map((l) => ({ value: l.id, label: warehouseId ? `${l.name} (${l.code})` : `${l.warehouse.code} / ${l.name} (${l.code})` })),
  ]

  function renderPill(label: string, onClear?: () => void) {
    return (
      <span className={PILL} key={label}>
        {label}
        {onClear && (
          <span className="material-symbols-outlined text-[13px] text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => updateFilter(onClear)} title="Remove filter">close</span>
        )}
      </span>
    )
  }

  function renderTableState() {
    if (loadError) {
      return (
        <tr>
          <td className="py-14 px-4 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">error</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">Couldn&apos;t load the stock ledger</p>
            <p className="text-xs text-slate-500 mt-1">{loadError}</p>
            <button className="mt-4 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium shadow-2xs inline-flex items-center gap-1.5 transition-all" onClick={refresh} type="button">
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
            Loading stock movements...
          </td>
        </tr>
      )
    }
    if (rows.length === 0) {
      return (
        <tr>
          <td className="py-14 px-4 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">{hasFilters ? 'search_off' : 'history'}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{hasFilters ? 'No stock movements match your filters' : 'No stock movements yet'}</p>
            <p className="text-xs text-slate-500 mt-1">
              {hasFilters ? 'Try a different search term or reset the filters.' : 'Movements appear when receipts, deliveries, transfers or adjustments are validated.'}
            </p>
            {hasFilters && (
              <button className="mt-4 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium shadow-2xs inline-flex items-center gap-1.5 transition-all" onClick={resetFilters} type="button">
                <span className="material-symbols-outlined text-[16px] text-slate-500">restart_alt</span>
                <span>Reset Filters</span>
              </button>
            )}
          </td>
        </tr>
      )
    }
    return rows.map((entry) => <LedgerRow entry={entry} isSelected={isDrawerOpen && inspected?.id === entry.id} key={entry.id} onInspect={inspect} />)
  }

  return (
    // Desktop App Window Shell Container
    <div className="w-full max-w-[1720px] mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/90 flex flex-col flex-1 overflow-hidden relative">
      <LedgerHeader isExporting={isExporting} onExport={exportLedger} onSearchChange={(value) => updateFilter(() => setSearch(value))} search={search} searchRef={headerSearchRef} />
      {/* Main Scrollable Body Content */}
      <main className="flex-1 p-5 md:p-6 bg-slate-50/50 overflow-y-auto pb-28">
        {/* Breadcrumbs & Operations Sub-Header */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
            <span className="hover:text-slate-800 cursor-pointer" onClick={() => navigate(ROUTES.dashboard)}>Operations</span>
            <span className="text-slate-400">/</span>
            <span className="hover:text-slate-800 cursor-pointer">Stock Ledger</span>
            <span className="text-slate-400">/</span>
            <span className="font-mono text-indigo-600 font-semibold">/move-history</span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-display font-extrabold text-slate-900 tracking-tight">Stock Ledger &amp; Move History</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Append-Only Ledger
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono text-xs font-semibold">
                  {overview ? `${formatQty(overview.total)} ${overview.total === 1 ? 'Movement' : 'Movements'}` : '— Movements'}
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Chronological, append-only record of every validated receipt, delivery, internal transfer and inventory adjustment, per location.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
              <button className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-60" disabled={isExporting} onClick={exportLedger} type="button">
                <span className={isExporting ? 'material-symbols-outlined text-[16px] text-slate-500 animate-spin' : 'material-symbols-outlined text-[16px] text-slate-500'}>{isExporting ? 'progress_activity' : 'download'}</span>
                Export Audit Log
              </button>
              <button className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5 disabled:opacity-60" disabled={!inspected} onClick={() => setIsDrawerOpen(true)} type="button">
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                Inspect Ledger
              </button>
            </div>
          </div>
        </div>
        {/* Read-only Ledger Banner */}
        <div className="mb-5 p-3 px-4 rounded-xl bg-indigo-50/70 border border-indigo-100/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700">
            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <span className="material-symbols-outlined text-[15px]">verified_user</span>
            </span>
            <span>
              <strong className="font-semibold text-indigo-900">Read-only ledger:</strong> entries are written only when Receipts, Deliveries, Transfers &amp; Adjustments are validated, and can&apos;t be edited or deleted
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
              Read-Only
            </span>
            <button className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white text-slate-700 border border-indigo-200 hover:bg-indigo-50 shadow-2xs transition-colors" onClick={resetFilters} type="button">
              All Records
            </button>
            <button className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white text-slate-700 border border-indigo-200 hover:bg-indigo-50 shadow-2xs transition-colors disabled:opacity-60" disabled={isExporting} onClick={exportLedger} type="button">
              Export CSV
            </button>
            <button className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-colors flex items-center gap-1 disabled:opacity-60" disabled={!inspected} onClick={() => setIsDrawerOpen(true)} type="button">
              <span className="material-symbols-outlined text-[13px]">visibility</span>
              {inspected ? `Inspect ${inspected.reference}` : 'Inspect'}
            </button>
          </div>
        </div>
        <KpiCards summary={summary} />
        {/* Filter & Search Controls Bar */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs mb-5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Main Search Input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
              <input
                className="w-full pl-9 pr-14 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                onChange={(e) => updateFilter(() => setSearch(e.target.value))}
                placeholder="Search stock movements by product, SKU or reference..."
                ref={searchInputRef}
                type="text"
                value={search}
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">⌘F</kbd>
            </div>
            {/* Dropdown Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <LedgerFilterSelect
                id="ledgerMovementType"
                label={<>Movement Type: <strong className="font-semibold text-slate-900">{movementType ? MOVEMENT_BADGES[movementType].label : `All (${MOVEMENT_TYPES.length})`}</strong></>}
                onChange={(value) => updateFilter(() => setMovementType(value as MovementType | ''))}
                options={MOVEMENT_OPTIONS}
                value={movementType}
              />
              <LedgerFilterSelect
                id="ledgerWarehouse"
                label={warehouseName ?? 'All Warehouses'}
                onChange={(value) =>
                  updateFilter(() => {
                    setWarehouseId(value)
                    setLocationId('')
                  })}
                options={warehouseOptions}
                value={warehouseId}
              />
              <LedgerFilterSelect id="ledgerLocation" label={locationName ?? 'All Locations & Bins'} onChange={(value) => updateFilter(() => setLocationId(value))} options={locationOptions} value={locationId} />
              <LedgerFilterSelect icon="calendar_today" id="ledgerDateRange" label={dateLabel} onChange={(value) => updateFilter(() => setDatePreset(value as DatePreset))} options={DATE_OPTIONS} value={datePreset} />
              <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors" onClick={resetFilters} title="Reset Filters" type="button">
                <span className="material-symbols-outlined text-[17px]">restart_alt</span>
              </button>
            </div>
          </div>
          {/* Active Filter Pills & Results Count */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {search.trim() && renderPill(`Search: "${search.trim()}"`, () => setSearch(''))}
              {renderPill(`Type: ${movementType ? MOVEMENT_BADGES[movementType].label : 'All Movements'}`, movementType ? () => setMovementType('') : undefined)}
              {renderPill(
                `Warehouse: ${warehouseName ?? 'All Warehouses'}`,
                warehouseId
                  ? () => {
                      setWarehouseId('')
                      setLocationId('')
                    }
                  : undefined,
              )}
              {locationId && renderPill(`Location: ${locationName ?? '…'}`, () => setLocationId(''))}
              {renderPill(`Timeframe: ${dateLabel}`, datePreset ? () => setDatePreset('') : undefined)}
            </div>
            <div className="text-slate-500 font-mono text-[11px]">
              {pagination
                ? (
                    <>
                      Showing <strong className="text-slate-900 font-semibold font-sans">{formatQty(rows.length)}</strong> of {formatQty(pagination.total)} ledger records
                    </>
                  )
                : 'Loading ledger records...'}
            </div>
          </div>
        </div>
        {exportError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {exportError}
            </span>
            <button className="p-0.5 rounded text-rose-500 hover:text-rose-700" onClick={() => setExportError(null)} type="button">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}
        {/* Main Workspace Split: Table + Inspection Drawer */}
        <div className="flex flex-col xl:flex-row gap-5 items-start">
          {/* Enterprise Ledger Table Container */}
          <div className="w-full flex-1 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[19px]">history_edu</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Historical Stock Movement &amp; Audit Records</h2>
                  <p className="text-xs text-slate-500">Newest first · transfers write an OUT entry at the source and an IN entry at the destination</p>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  APPEND-ONLY
                </span>
                <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500 pl-2 border-l border-slate-200">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Positive Inflow</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Negative Outflow</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-600" /> Internal Transfer</span>
                </div>
              </div>
            </div>
            {/* Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4">Product &amp; SKU</th>
                    <th className="py-3 px-4 text-right">Quantity &amp; Direction</th>
                    <th className="py-3 px-4">Flow Path (From → To)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={isLoading && rows.length > 0 ? 'divide-y divide-slate-100 text-slate-700 opacity-60 transition-opacity' : 'divide-y divide-slate-100 text-slate-700'}>{renderTableState()}</tbody>
              </table>
            </div>
            {/* Table Footer & Immutable Statement */}
            <div className="p-3.5 px-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="material-symbols-outlined text-[17px] text-indigo-600">security</span>
                <span>All ledger entries are generated automatically by validated operations. Movements are permanent and strictly read-only.</span>
              </div>
              {!loadError && pagination && pagination.total > 0 && (
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-slate-500 font-mono text-[11px]">{`Showing ${firstShown}-${lastShown} of ${formatQty(pagination.total)}`}</span>
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-40" disabled={shownPage <= 1} onClick={() => setPage(Math.max(1, shownPage - 1))} type="button">
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
                    {pageList(shownPage, totalPages).map((item, i) =>
                      item === 'gap'
                        ? <span className="text-slate-400 px-0.5 text-xs" key={`gap-${i}`}>...</span>
                        : (
                            <button className={`${item === shownPage ? PAGE_ACTIVE : PAGE_BUTTON} ${item > 99 ? 'px-1.5 h-6' : 'w-6 h-6'}`} key={item} onClick={() => setPage(item)} type="button">
                              {item}
                            </button>
                          ),
                    )}
                    <button className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-40" disabled={shownPage >= totalPages} onClick={() => setPage(Math.min(totalPages, shownPage + 1))} type="button">
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <InspectorDrawer entry={inspected} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
        </div>
      </main>
      <LedgerDock />
      <LedgerFooter latestAt={overview?.latestAt ?? null} totalMovements={overview?.total ?? null} />
    </div>
  )
}
