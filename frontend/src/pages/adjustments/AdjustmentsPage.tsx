import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { applyAdjustment, cancelAdjustment, exportAdjustmentsCsv, getAdjustmentSummary, listAdjustments, refreshAdjustment, type AdjustmentFilters } from '../../api/adjustments.ts'
import type { Adjustment, AdjustmentSummary, Location, Paginated, Warehouse } from '../../api/types.ts'
import { listLocations, listWarehouses } from '../../api/warehouses.ts'
import { useCurrentUser } from '../../auth/useAuth.ts'
import { usePillAction } from '../../context/pillActions.ts'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { errorMessage, formatQty, useDebouncedValue } from '../products/productsData.ts'
import { AdjustmentRow } from './components/AdjustmentRow.tsx'
import { ApplyModal } from './components/ApplyModal.tsx'
import { CreateAdjustmentModal } from './components/CreateAdjustmentModal.tsx'
import { FilterSelect } from './components/FilterSelect.tsx'
import { InspectorDrawer } from './components/InspectorDrawer.tsx'
import { KpiCardView } from './components/KpiCardView.tsx'
import {
  applyToastSubtitle,
  DATE_OPTIONS,
  dateRangeFor,
  isStaleStockError,
  KPI_CARDS,
  signedQty,
  STATUS_LABELS,
  STATUS_OPTIONS,
  type AdjustmentStatus,
  type DatePreset,
  type KpiKey,
  type SelectOption,
} from './data.ts'

const PAGE_SIZE = 10
const TABLE_COLUMNS = 10

const CHIP = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-200/80'
const RIBBON_ACTIVE = 'px-2.5 py-1 rounded-md font-semibold bg-indigo-600 text-white shadow-xs flex items-center gap-1 transition-all'
const RIBBON_IDLE = 'px-2.5 py-1 rounded-md font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1'

/** Editor modal: closed (null), create (adjustment null) or edit a DRAFT */
type EditorState = { adjustment: Adjustment | null } | null

function refreshedSubtitle(a: Adjustment) {
  return `${a.reference}: recorded ${formatQty(a.recordedQuantity)} ${a.product.unitOfMeasure}, difference ${signedQty(a.difference)}.`
}

export default function AdjustmentsPage() {
  useDocumentTitle('StockSense — Inventory Adjustments')
  const { showToast } = useToast()
  const user = useCurrentUser()
  const canApply = user?.role === 'INVENTORY_MANAGER'
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [statusFilter, setStatusFilter] = useState<AdjustmentStatus | ''>('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [result, setResult] = useState<Paginated<Adjustment> | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  // Key of the last request that settled; anything else means a request is in flight
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const [summary, setSummary] = useState<AdjustmentSummary | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selected, setSelected] = useState<Adjustment | null>(null)
  const [editor, setEditor] = useState<EditorState>(null)

  const [applyTarget, setApplyTarget] = useState<Adjustment | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [applyStale, setApplyStale] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const currentFilters = useMemo<AdjustmentFilters>(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      warehouseId: warehouseFilter || undefined,
      locationId: locationFilter || undefined,
      ...dateRangeFor(datePreset),
    }),
    [debouncedSearch, statusFilter, warehouseFilter, locationFilter, datePreset],
  )
  const hasFilters = Boolean(search.trim() || statusFilter || warehouseFilter || locationFilter || datePreset)
  const requestKey = `${JSON.stringify(currentFilters)}|${page}|${reloadKey}`
  const isLoading = settledKey !== requestKey
  const loadError = isLoading ? null : fetchError

  // Filter dropdown sources
  useEffect(() => {
    listWarehouses({ limit: 100 })
      .then((res) => setWarehouses(res.data))
      .catch(() => setWarehouses([]))
    listLocations()
      .then(setLocations)
      .catch(() => setLocations([]))
  }, [])

  // Adjustments page for the current filters
  useEffect(() => {
    let cancelled = false
    listAdjustments({ ...currentFilters, page, limit: PAGE_SIZE })
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
        setFetchError(errorMessage(err, 'Could not load adjustments. Please try again.'))
        setSettledKey(requestKey)
      })
    return () => {
      cancelled = true
    }
  }, [currentFilters, page, requestKey])

  // KPI cards
  useEffect(() => {
    let cancelled = false
    getAdjustmentSummary()
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

  // ⌘F / Ctrl+F focuses the search
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const refresh = useCallback(() => setReloadKey((key) => key + 1), [])

  const locationOptions = warehouseFilter ? locations.filter((l) => l.warehouse.id === warehouseFilter) : locations
  const warehouseName = warehouses.find((w) => w.id === warehouseFilter)?.name
  const locationName = locations.find((l) => l.id === locationFilter)?.name
  const dateLabel = DATE_OPTIONS.find((o) => o.value === datePreset)?.label

  const warehouseSelectOptions: SelectOption[] = [{ value: '', label: 'All Warehouses' }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]
  const locationSelectOptions: SelectOption[] = [
    { value: '', label: 'All Locations & Bins' },
    ...locationOptions.map((l) => ({ value: l.id, label: warehouseFilter ? l.name : `${l.warehouse.code} / ${l.name}` })),
  ]

  function updateFilter(apply: () => void) {
    apply()
    setPage(1)
  }

  // Status filter from the ribbon and KPI cards ('' = all)
  function filterByStatus(status: KpiKey) {
    updateFilter(() => setStatusFilter(status))
  }

  function changeWarehouse(value: string) {
    updateFilter(() => {
      setWarehouseFilter(value)
      // Keep the location only if it belongs to the chosen warehouse
      if (value && locationFilter && locations.find((l) => l.id === locationFilter)?.warehouse.id !== value) setLocationFilter('')
    })
  }

  function resetAllFilters() {
    setSearch('')
    setStatusFilter('')
    setWarehouseFilter('')
    setLocationFilter('')
    setDatePreset('')
    setPage(1)
  }

  async function exportAdjustmentsCSV() {
    setIsExporting(true)
    setActionError(null)
    try {
      await exportAdjustmentsCsv(currentFilters)
      showToast('Export Finished', 'StockSense_Adjustments.csv downloaded.')
    } catch (err) {
      setActionError(errorMessage(err, 'Could not export adjustments. Please try again.'))
    } finally {
      setIsExporting(false)
    }
  }

  function openCreateAdjustmentModal() {
    setEditor({ adjustment: null })
  }

  function openEditModal(adjustment: Adjustment) {
    setIsDrawerOpen(false)
    setEditor({ adjustment })
  }

  function handleSaved(adjustment: Adjustment, applied: boolean, saveApplyError: string | null) {
    const wasEditing = Boolean(editor?.adjustment)
    setEditor(null)
    setActionError(null)
    if (applied) showToast('Adjustment Applied', applyToastSubtitle(adjustment))
    else showToast(wasEditing ? 'Draft Updated' : 'Draft Saved', `${adjustment.reference} saved as a draft (${signedQty(adjustment.difference)} ${adjustment.product.unitOfMeasure}).`)
    if (saveApplyError) setActionError(`${adjustment.reference} was saved as a draft but could not be applied: ${saveApplyError}`)
    if (selected?.id === adjustment.id) setSelected(adjustment)
    refresh()
  }

  function openInspectorDrawer(adjustment: Adjustment) {
    setSelected(adjustment)
    setIsDrawerOpen(true)
  }

  function closeInspectorDrawer() {
    setIsDrawerOpen(false)
  }

  async function runAction(adjustment: Adjustment, action: (id: string) => Promise<Adjustment>, title: string, subtitle: (a: Adjustment) => string, fallback: string) {
    setBusyId(adjustment.id)
    setActionError(null)
    try {
      const updated = await action(adjustment.id)
      if (selected?.id === updated.id) setSelected(updated)
      showToast(title, subtitle(updated))
    } catch (err) {
      setActionError(errorMessage(err, fallback))
    } finally {
      setBusyId(null)
      // Refetch either way: a failed action usually means the adjustment changed elsewhere
      refresh()
    }
  }

  function handleCancel(adjustment: Adjustment) {
    if (!window.confirm(`Cancel adjustment ${adjustment.reference}? It will be kept as Canceled and stock will not change. This can't be undone.`)) return
    void runAction(adjustment, cancelAdjustment, 'Adjustment Canceled', (a) => `${a.reference} has been canceled.`, 'Could not cancel the adjustment. Please try again.')
  }

  function handleRefresh(adjustment: Adjustment) {
    void runAction(adjustment, refreshAdjustment, 'Recorded Quantity Refreshed', refreshedSubtitle, 'Could not refresh the recorded quantity. Please try again.')
  }

  function openApplyModal(adjustment: Adjustment) {
    setIsDrawerOpen(false)
    setApplyError(null)
    setApplyStale(adjustment.isStale)
    setApplyTarget(adjustment)
  }

  function closeApplyModal() {
    if (isApplying || isRefreshing) return
    setApplyTarget(null)
    setApplyError(null)
    setApplyStale(false)
  }

  async function confirmApply() {
    if (!applyTarget) return
    setIsApplying(true)
    setApplyError(null)
    try {
      const applied = await applyAdjustment(applyTarget.id)
      setApplyTarget(null)
      if (selected?.id === applied.id) setSelected(applied)
      showToast('Adjustment Applied', applyToastSubtitle(applied))
    } catch (err) {
      setApplyStale(isStaleStockError(err))
      setApplyError(errorMessage(err, 'Could not apply the adjustment. Please try again.'))
    } finally {
      setIsApplying(false)
      refresh()
    }
  }

  async function refreshApplyTarget() {
    if (!applyTarget) return
    setIsRefreshing(true)
    try {
      const updated = await refreshAdjustment(applyTarget.id)
      setApplyTarget(updated)
      setApplyStale(updated.isStale)
      setApplyError(null)
      if (selected?.id === updated.id) setSelected(updated)
      showToast('Recorded Quantity Refreshed', refreshedSubtitle(updated))
    } catch (err) {
      setApplyStale(false)
      setApplyError(errorMessage(err, 'Could not refresh the recorded quantity. Please try again.'))
    } finally {
      setIsRefreshing(false)
      refresh()
    }
  }

  usePillAction('new-adjustment', openCreateAdjustmentModal)

  const rows = result?.data ?? []
  const pagination = result?.pagination
  const totalPages = Math.max(1, pagination?.totalPages ?? 1)
  const shownPage = pagination?.page ?? page
  const firstShown = rows.length > 0 ? (shownPage - 1) * (pagination?.limit ?? PAGE_SIZE) + 1 : 0
  const lastShown = firstShown > 0 ? firstShown + rows.length - 1 : 0

  function kpiCount(key: KpiKey) {
    if (!summary) return null
    return key ? summary[key] : summary.total
  }

  function renderTableState() {
    if (loadError) {
      return (
        <tr>
          <td className="py-14 px-4 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">error</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">Couldn&apos;t load adjustments</p>
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
            Loading adjustments...
          </td>
        </tr>
      )
    }
    if (rows.length === 0) {
      return (
        <tr>
          <td className="py-14 px-4 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">{hasFilters ? 'search_off' : 'tune'}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{hasFilters ? 'No adjustments match your filters' : 'No adjustments yet'}</p>
            <p className="text-xs text-slate-500 mt-1">{hasFilters ? 'Try a different search term or reset the filters.' : 'Record a physical count to reconcile system stock with what is on the shelf.'}</p>
            {hasFilters ? (
              <button className="mt-4 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs inline-flex items-center gap-1.5 transition-all" onClick={resetAllFilters}>
                <span className="material-symbols-outlined text-[16px] text-slate-500">restart_alt</span>
                <span>Reset Filters</span>
              </button>
            ) : (
              <button className="mt-4 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-[0.98]" onClick={openCreateAdjustmentModal}>
                <span className="material-symbols-outlined text-[17px]">add</span>
                <span>New Adjustment</span>
              </button>
            )}
          </td>
        </tr>
      )
    }
    return rows.map((adjustment) => (
      <AdjustmentRow
        adjustment={adjustment}
        canApply={canApply}
        isBusy={busyId === adjustment.id}
        key={adjustment.id}
        onApply={openApplyModal}
        onCancel={handleCancel}
        onEdit={openEditModal}
        onInspect={openInspectorDrawer}
        onRefresh={handleRefresh}
      />
    ))
  }

  function renderChip(label: string, onClear: () => void) {
    return (
      <span className={CHIP} key={label}>
        {label}
        <span className="material-symbols-outlined text-[13px] cursor-pointer hover:text-indigo-900" onClick={() => updateFilter(onClear)} title="Remove filter">
          close
        </span>
      </span>
    )
  }

  return (
    <>
      {/* MAIN INTERIOR CONTENT */}
      <main className="w-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-8 transition-all duration-150">
        {/* Quick View Ribbon */}
        <div className="bg-indigo-50/60 border border-indigo-100/90 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-950">
            <span className="material-symbols-outlined text-indigo-600 text-[18px]">tune</span>
            <span>Quick View:</span>
            <span className="text-[11px] font-normal text-indigo-700 hidden sm:inline">Physical stock reconciliation &amp; variance auditing</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] bg-white p-0.5 rounded-lg border border-indigo-200/70 shadow-xs">
            <button className={statusFilter === 'DRAFT' ? RIBBON_ACTIVE : RIBBON_IDLE} onClick={() => filterByStatus('DRAFT')}>
              <span className="material-symbols-outlined text-[13px]">visibility</span> Drafts to Apply
            </button>
            <button className={statusFilter === '' ? RIBBON_ACTIVE : RIBBON_IDLE} onClick={() => filterByStatus('')}>
              <span className="material-symbols-outlined text-[13px]">list</span> All Records
            </button>
            <div className="h-3.5 w-[1px] bg-indigo-200/80 mx-1" />
            <button className="px-2.5 py-1 rounded-md font-medium text-indigo-700 hover:bg-indigo-50 transition-all flex items-center gap-1" onClick={openCreateAdjustmentModal}>
              <span className="material-symbols-outlined text-[13px]">add</span> New Adjustment
            </button>
          </div>
        </div>

        {/* Breadcrumbs & Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[15px]">tune</span>
                <span>Operations</span>
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800">Adjustments</span>
              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-indigo-50 text-indigo-700 font-medium ml-1">/adjustments</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Adjustments</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Physical Reconciliation
              </span>
              <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{summary ? `${formatQty(summary.total)} Total` : '— Total'}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Reconcile recorded inventory with physical stock counts. Applying an adjustment sets stock to the counted quantity and writes an append-only ledger entry.</p>
          </div>
          {/* Header Actions */}
          <div className="flex items-center gap-2.5">
            <button className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-60" disabled={isExporting} onClick={exportAdjustmentsCSV}>
              <span className={isExporting ? 'material-symbols-outlined text-[16px] text-slate-500 animate-spin' : 'material-symbols-outlined text-[16px] text-slate-500'}>{isExporting ? 'progress_activity' : 'download'}</span>
              <span>Export CSV</span>
            </button>
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98]" onClick={openCreateAdjustmentModal}>
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>New Adjustment</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KPI_CARDS.map((card) => (
            <KpiCardView card={card} count={kpiCount(card.key)} isActive={card.key === statusFilter} key={card.key || 'TOTAL'} onSelect={filterByStatus} />
          ))}
        </div>

        {/* Search & Segmented Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full lg:w-96">
              <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-[18px]">search</span>
              <input
                className="w-full pl-9 pr-12 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                id="reconciliationSearch"
                onChange={(e) => updateFilter(() => setSearch(e.target.value))}
                placeholder="Search reference, product or SKU..."
                ref={searchInputRef}
                type="text"
                value={search}
              />
              <kbd className="absolute right-2.5 top-1.5 px-1.5 py-0.2 text-[10px] font-medium font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">⌘F</kbd>
            </div>
            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect id="statusFilterSelect" onChange={(value) => updateFilter(() => setStatusFilter(value as AdjustmentStatus | ''))} options={STATUS_OPTIONS} value={statusFilter} />
              <FilterSelect id="warehouseFilterSelect" onChange={changeWarehouse} options={warehouseSelectOptions} value={warehouseFilter} />
              <FilterSelect id="locationFilterSelect" onChange={(value) => updateFilter(() => setLocationFilter(value))} options={locationSelectOptions} value={locationFilter} />
              <FilterSelect id="dateFilterSelect" onChange={(value) => updateFilter(() => setDatePreset(value as DatePreset))} options={DATE_OPTIONS} value={datePreset} />
              <button className="text-xs font-medium text-slate-500 hover:text-indigo-600 px-2 py-1.5 flex items-center gap-1 transition-colors" onClick={resetAllFilters}>
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                <span>Reset</span>
              </button>
            </div>
          </div>
          {/* Active Filter Tags & Count Summary */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 text-[11px]">Active filters:</span>
              {!hasFilters && <span className="text-slate-400 text-[11px]">None</span>}
              {search.trim() && renderChip(`Search: "${search.trim()}"`, () => setSearch(''))}
              {statusFilter && renderChip(`Status: ${STATUS_LABELS[statusFilter]}`, () => setStatusFilter(''))}
              {warehouseFilter && renderChip(`Warehouse: ${warehouseName ?? '…'}`, () => setWarehouseFilter(''))}
              {locationFilter && renderChip(`Location: ${locationName ?? '…'}`, () => setLocationFilter(''))}
              {datePreset && renderChip(`Date: ${dateLabel ?? datePreset}`, () => setDatePreset(''))}
              {hasFilters && (
                <button className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 transition-colors" onClick={resetAllFilters}>
                  Reset all
                </button>
              )}
            </div>
            <span className="text-slate-500 font-mono text-[11px]">
              {pagination ? (
                <>
                  Showing <span className="font-bold text-slate-800" id="visibleCount">{rows.length}</span> of {formatQty(pagination.total)} records
                </>
              ) : (
                'Loading records...'
              )}
            </span>
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

        {/* Main Reconciliation Data Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Header of Table Card */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Physical Count &amp; Stock Reconciliation Records</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Append-only Ledger
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Applied adjustments are posted to the stock ledger as ADJUSTMENT_IN / ADJUSTMENT_OUT entries.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-500 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />Recorded Qty
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />Physical Count
              </span>
            </div>
          </div>
          {/* Crisp Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Reference</th>
                  <th className="py-3 px-5">Product &amp; SKU</th>
                  <th className="py-3 px-5">Warehouse &amp; Bin</th>
                  <th className="py-3 px-5 text-right">Recorded Qty</th>
                  <th className="py-3 px-5 text-right">Counted Qty</th>
                  <th className="py-3 px-4 text-center">Difference</th>
                  <th className="py-3 px-5">Reason</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-5">Created</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={isLoading && rows.length > 0 ? 'divide-y divide-slate-100 font-sans opacity-60 transition-opacity' : 'divide-y divide-slate-100 font-sans'}>{renderTableState()}</tbody>
            </table>
          </div>
          {/* Table Footer Note and Pagination */}
          <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[15px] text-indigo-600">verified_user</span>
              <span>Only applied adjustments change stock. A draft goes stale if stock moves before it is applied.</span>
            </div>
            {!loadError && pagination && pagination.total > 0 && (
              <div className="flex items-center gap-3 font-mono">
                <span>{`Showing ${firstShown}–${lastShown} of ${formatQty(pagination.total)} adjustments`}</span>
                <div className="flex items-center gap-1">
                  <button className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors shadow-2xs disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} title="Previous Page" type="button">
                    <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                  </button>
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-semibold text-[10px]">{shownPage}</span>
                  <span className="text-slate-400">/</span>
                  <span className="px-2 py-0.5 text-slate-600 text-[10px]">{totalPages}</span>
                  <button className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors shadow-2xs disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} title="Next Page" type="button">
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* SLIDE-OVER DRAWER: Detail View Panel */}
      <InspectorDrawer
        adjustment={selected}
        canApply={canApply}
        isBusy={selected !== null && busyId === selected.id}
        isOpen={isDrawerOpen}
        onApply={openApplyModal}
        onCancel={handleCancel}
        onClose={closeInspectorDrawer}
        onEdit={openEditModal}
        onRefresh={handleRefresh}
      />

      {/* MODAL 1: Create / Edit Adjustment */}
      {editor && <CreateAdjustmentModal adjustment={editor.adjustment} canApply={canApply} onClose={() => setEditor(null)} onSaved={handleSaved} />}

      {/* MODAL 2: Apply Confirmation Dialog */}
      {applyTarget && <ApplyModal error={applyError} isPosting={isApplying} isRefreshing={isRefreshing} isStale={applyStale} onClose={closeApplyModal} onConfirm={confirmApply} onRefresh={refreshApplyTarget} target={applyTarget} />}
    </>
  )
}
