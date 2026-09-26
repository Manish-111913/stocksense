import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { cancelReceipt, confirmReceipt, exportReceiptsCsv, getReceiptSummary, listReceipts, listSuppliers, markReceiptReady, validateReceipt, type ReceiptFilters } from '../../api/receipts.ts'
import { DOCUMENT_STATUS_LABEL, type DocumentStatus, type Location, type Paginated, type Receipt, type ReceiptStockChange, type ReceiptSummary, type Supplier, type Warehouse } from '../../api/types.ts'
import { listLocations, listWarehouses } from '../../api/warehouses.ts'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { receiptPath, ROUTES } from '../../routes.ts'
import { errorMessage, formatQty, useDebouncedValue } from '../products/productsData.ts'
import { FilterSelect } from './list/FilterSelect.tsx'
import { ReceiptRow } from './list/ReceiptRow.tsx'
import { DATE_OPTIONS, dateRangeFor, KPI_CARD_ACTIVE, KPI_CARD_INACTIVE, KPI_CARDS, STATUS_OPTIONS, type DatePreset, type SelectOption } from './list/receiptsData.ts'
import { ValidateModal } from './list/ValidateModal.tsx'

const PAGE_SIZE = 10
const TABLE_COLUMNS = 8

const CHIP = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-200/70'

/** "SKU: 10 → 25 PCS" for the first few lines, then "+N more" */
function stockChangeSummary(changes: ReceiptStockChange[]) {
  const shown = changes.slice(0, 2).map((c) => `${c.sku}: ${formatQty(c.before)} → ${formatQty(c.after)} ${c.unitOfMeasure}`)
  if (changes.length > 2) shown.push(`+${changes.length - 2} more`)
  return shown.join(', ')
}

export default function ReceiptsPage() {
  useDocumentTitle('StockSense — Receipts Management')
  const navigate = useNavigate()
  const { showToast } = useToast()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [result, setResult] = useState<Paginated<Receipt> | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  // Key of the last request that settled; anything else means a request is in flight
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const [summary, setSummary] = useState<ReceiptSummary | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const [validateTarget, setValidateTarget] = useState<Receipt | null>(null)
  const [validateError, setValidateError] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)

  const currentFilters = useMemo<ReceiptFilters>(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      supplierId: supplierFilter || undefined,
      warehouseId: warehouseFilter || undefined,
      locationId: locationFilter || undefined,
      ...dateRangeFor(datePreset),
    }),
    [debouncedSearch, statusFilter, supplierFilter, warehouseFilter, locationFilter, datePreset],
  )
  const hasFilters = Boolean(search.trim() || statusFilter || supplierFilter || warehouseFilter || locationFilter || datePreset)
  const requestKey = `${JSON.stringify(currentFilters)}|${page}|${reloadKey}`
  const isLoading = settledKey !== requestKey
  const loadError = isLoading ? null : fetchError

  // Filter dropdown sources
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    listSuppliers()
      .then(setSuppliers)
      .catch(() => setSuppliers([]))
    listWarehouses({ limit: 100 })
      .then((res) => setWarehouses(res.data))
      .catch(() => setWarehouses([]))
    listLocations()
      .then(setLocations)
      .catch(() => setLocations([]))
  }, [])

  // Receipts page for the current filters
  useEffect(() => {
    let cancelled = false
    listReceipts({ ...currentFilters, page, limit: PAGE_SIZE })
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
        setFetchError(errorMessage(err, 'Could not load receipts. Please try again.'))
        setSettledKey(requestKey)
      })
    return () => {
      cancelled = true
    }
  }, [currentFilters, page, requestKey])

  // KPI cards
  useEffect(() => {
    let cancelled = false
    getReceiptSummary()
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

  // ⌘F / Ctrl+F focuses the receipt search
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

  const locationOptions = warehouseFilter ? locations.filter((location) => location.warehouse.id === warehouseFilter) : locations
  const supplierName = suppliers.find((s) => s.id === supplierFilter)?.name
  const warehouseName = warehouses.find((w) => w.id === warehouseFilter)?.name
  const locationName = locations.find((l) => l.id === locationFilter)?.name
  const dateLabel = DATE_OPTIONS.find((o) => o.value === datePreset)?.label

  const supplierSelectOptions: SelectOption[] = [{ value: '', label: 'All Suppliers' }, ...suppliers.map((s) => ({ value: s.id, label: s.status === 'ACTIVE' ? s.name : `${s.name} (inactive)` }))]
  const warehouseSelectOptions: SelectOption[] = [{ value: '', label: 'All Warehouses' }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]
  const locationSelectOptions: SelectOption[] = [
    { value: '', label: 'All Locations' },
    ...locationOptions.map((l) => ({ value: l.id, label: warehouseFilter ? l.name : `${l.warehouse.code} / ${l.name}` })),
  ]

  function updateFilter(apply: () => void) {
    apply()
    setPage(1)
  }

  // Status filter from the KPI cards (clicking the selected card clears it)
  function filterByStatus(status: DocumentStatus) {
    updateFilter(() => setStatusFilter((current) => (current === status ? '' : status)))
  }

  function changeWarehouse(value: string) {
    updateFilter(() => {
      setWarehouseFilter(value)
      // Keep the location only if it belongs to the chosen warehouse
      if (value && locationFilter && locations.find((l) => l.id === locationFilter)?.warehouse.id !== value) setLocationFilter('')
    })
  }

  function resetAllReceiptFilters() {
    setSearch('')
    setStatusFilter('')
    setSupplierFilter('')
    setWarehouseFilter('')
    setLocationFilter('')
    setDatePreset('')
    setPage(1)
  }

  function openReceipt(receipt: Receipt) {
    navigate(receiptPath(receipt.id))
  }

  async function runAction(receipt: Receipt, action: (id: string) => Promise<unknown>, title: string, subtitle: string, fallback: string) {
    setBusyId(receipt.id)
    setActionError(null)
    try {
      await action(receipt.id)
      showToast(title, subtitle)
    } catch (err) {
      setActionError(errorMessage(err, fallback))
    } finally {
      setBusyId(null)
      // Refetch either way: a failed action usually means the receipt changed elsewhere
      refresh()
    }
  }

  function handleConfirm(receipt: Receipt) {
    void runAction(receipt, confirmReceipt, 'Receipt Confirmed', `${receipt.reference} is now waiting for goods.`, 'Could not confirm the receipt. Please try again.')
  }

  function handleMarkReady(receipt: Receipt) {
    void runAction(receipt, markReceiptReady, 'Receipt Ready', `${receipt.reference} is ready to validate.`, 'Could not mark the receipt ready. Please try again.')
  }

  function handleCancel(receipt: Receipt) {
    if (!window.confirm(`Cancel receipt ${receipt.reference}? It will be kept as Canceled and no stock will move. This can't be undone.`)) return
    void runAction(receipt, cancelReceipt, 'Receipt Canceled', `${receipt.reference} has been canceled.`, 'Could not cancel the receipt. Please try again.')
  }

  function openValidateModal(receipt: Receipt) {
    setValidateError(null)
    setValidateTarget(receipt)
  }

  function closeValidateModal() {
    if (isPosting) return
    setValidateTarget(null)
    setValidateError(null)
  }

  async function confirmReceiptValidation() {
    if (!validateTarget) return
    setIsPosting(true)
    setValidateError(null)
    try {
      const validated = await validateReceipt(validateTarget.id)
      setValidateTarget(null)
      const changes = stockChangeSummary(validated.stockChanges)
      showToast('Receipt Validated', `${validated.reference} posted to the Stock Ledger.${changes ? ` ${changes}` : ''}`)
      refresh()
    } catch (err) {
      setValidateError(errorMessage(err, 'Could not validate the receipt. Please try again.'))
      refresh()
    } finally {
      setIsPosting(false)
    }
  }

  async function exportReceiptsCSV() {
    setIsExporting(true)
    setActionError(null)
    try {
      await exportReceiptsCsv(currentFilters)
      showToast('Export Finished', 'StockSense_Receipts.csv downloaded.')
    } catch (err) {
      setActionError(errorMessage(err, 'Could not export receipts. Please try again.'))
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

  function renderTableState() {
    if (loadError) {
      return (
        <tr>
          <td className="py-14 px-4 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">error</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">Couldn&apos;t load receipts</p>
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
            Loading receipts...
          </td>
        </tr>
      )
    }
    if (rows.length === 0) {
      return (
        <tr>
          <td className="py-14 px-4 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">{hasFilters ? 'search_off' : 'receipt_long'}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{hasFilters ? 'No receipts match your filters' : 'No receipts yet'}</p>
            <p className="text-xs text-slate-500 mt-1">{hasFilters ? 'Try a different search term or reset the filters.' : 'Create your first receipt to record incoming goods from a supplier.'}</p>
            {hasFilters ? (
              <button className="mt-4 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs inline-flex items-center gap-1.5 transition-all" onClick={resetAllReceiptFilters}>
                <span className="material-symbols-outlined text-[16px] text-slate-500">restart_alt</span>
                <span>Reset Filters</span>
              </button>
            ) : (
              <button className="mt-4 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-[0.98]" onClick={() => navigate(ROUTES.receiptNew)}>
                <span className="material-symbols-outlined text-[17px]">add_circle</span>
                <span>New Receipt</span>
              </button>
            )}
          </td>
        </tr>
      )
    }
    return rows.map((receipt) => (
      <ReceiptRow
        isBusy={busyId === receipt.id}
        key={receipt.id}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        onMarkReady={handleMarkReady}
        onOpen={openReceipt}
        onValidate={openValidateModal}
        receipt={receipt}
      />
    ))
  }

  function renderChip(label: string, onClear: () => void) {
    return (
      <span className={CHIP} key={label}>
        <span>{label}</span>
        <button className="hover:text-indigo-900 flex items-center" onClick={() => updateFilter(onClear)} title="Remove filter">
          <span className="material-symbols-outlined text-[13px]">close</span>
        </button>
      </span>
    )
  }

  return (
    <>
      {/* MAIN RECEIPTS VIEW */}
      <main className="w-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-7 transition-all duration-150" id="view-receipts-main">
        <div className="flex flex-col w-full">
          {/* Breadcrumbs & Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors cursor-pointer" onClick={() => navigate(ROUTES.dashboard)}>
                  <span className="material-symbols-outlined text-[15px]">corporate_fare</span>
                  <span>Operations</span>
                </span>
                <span className="text-slate-300">/</span>
                <span className="font-semibold text-slate-800">Receipts</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Receipts</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Inbound Goods
                </span>
                <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{summary ? `${formatQty(summary.total)} Total` : '— Total'}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Track incoming vendor shipments, staging berths, and atomic stock ledger postings.</p>
            </div>
            {/* Header Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-60" disabled={isExporting} onClick={exportReceiptsCSV}>
                <span className={isExporting ? 'material-symbols-outlined text-[16px] text-slate-500 animate-spin' : 'material-symbols-outlined text-[16px] text-slate-500'}>{isExporting ? 'progress_activity' : 'download'}</span>
                <span>Export CSV</span>
              </button>
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98]" onClick={() => navigate(ROUTES.receiptNew)}>
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>+ New Receipt</span>
              </button>
            </div>
          </div>

          {/* KPI SUMMARY CARDS (5 Lifecycle Stages) */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6" id="kpi-cards-grid">
            {KPI_CARDS.map((card) => (
              <div className={card.status === statusFilter ? KPI_CARD_ACTIVE : KPI_CARD_INACTIVE} data-status={card.status} key={card.status} onClick={() => filterByStatus(card.status)}>
                <div className={card.headClass}>
                  <span className={card.labelClass}>{DOCUMENT_STATUS_LABEL[card.status]}</span>
                  <span className={card.iconClass}>
                    <span className="material-symbols-outlined text-[17px]">{card.icon}</span>
                  </span>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className={card.countClass}>{summary ? formatQty(summary[card.status]) : '—'}</span>
                  <span className={card.unitClass}>{card.unit}</span>
                </div>
                <div className={card.footClass}>
                  <span className={card.captionClass}>{card.caption}</span>
                  <span className={card.badgeClass}>{card.badge}</span>
                </div>
              </div>
            ))}
          </section>

          {/* MULTI-PARAMETER SEARCH & FILTER SUITE */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs mb-5 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Input */}
              <div className="relative flex-1 max-w-lg">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                <input
                  className="w-full pl-9 pr-12 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium"
                  id="receiptsSearchInput"
                  onChange={(e) => updateFilter(() => setSearch(e.target.value))}
                  placeholder="Search receipts by reference or supplier... (⌘F)"
                  ref={searchInputRef}
                  type="text"
                  value={search}
                />
                <kbd className="absolute right-2.5 top-1.5 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 bg-slate-100 rounded border border-slate-200">⌘F</kbd>
              </div>
              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-2">
                <FilterSelect
                  icon="expand_more"
                  id="receiptFilterStatus"
                  onChange={(value) => updateFilter(() => setStatusFilter(value as DocumentStatus | ''))}
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  wrapperClass="relative min-w-[130px]"
                />
                <FilterSelect
                  icon="expand_more"
                  id="receiptFilterWarehouse"
                  onChange={changeWarehouse}
                  options={warehouseSelectOptions}
                  value={warehouseFilter}
                  wrapperClass="relative min-w-[145px]"
                />
                <FilterSelect
                  icon="expand_more"
                  id="receiptFilterLocation"
                  onChange={(value) => updateFilter(() => setLocationFilter(value))}
                  options={locationSelectOptions}
                  value={locationFilter}
                  wrapperClass="relative min-w-[145px]"
                />
                <FilterSelect
                  icon="expand_more"
                  id="receiptFilterSupplier"
                  onChange={(value) => updateFilter(() => setSupplierFilter(value))}
                  options={supplierSelectOptions}
                  value={supplierFilter}
                  wrapperClass="relative min-w-[155px]"
                />
                <FilterSelect
                  icon="calendar_today"
                  id="receiptFilterDate"
                  onChange={(value) => updateFilter(() => setDatePreset(value as DatePreset))}
                  options={DATE_OPTIONS}
                  value={datePreset}
                  wrapperClass="relative min-w-[135px]"
                />
                {/* Reset Button */}
                <button className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors" onClick={resetAllReceiptFilters} title="Reset all filters">
                  <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                  <span>Reset</span>
                </button>
              </div>
            </div>
            {/* Active Filter Chips Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2 flex-wrap" id="activeChipsContainer">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Filters:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200/80">
                  <span className="material-symbols-outlined text-[13px] text-slate-400">tune</span>
                  <span>Scope: Inbound Goods</span>
                </span>
                {search.trim() && renderChip(`Search: "${search.trim()}"`, () => setSearch(''))}
                {statusFilter && renderChip(`Status: ${DOCUMENT_STATUS_LABEL[statusFilter]}`, () => setStatusFilter(''))}
                {supplierFilter && renderChip(`Supplier: ${supplierName ?? '…'}`, () => setSupplierFilter(''))}
                {warehouseFilter && renderChip(`Warehouse: ${warehouseName ?? '…'}`, () => setWarehouseFilter(''))}
                {locationFilter && renderChip(`Location: ${locationName ?? '…'}`, () => setLocationFilter(''))}
                {datePreset && renderChip(`Date: ${dateLabel ?? datePreset}`, () => setDatePreset(''))}
                {hasFilters && (
                  <button className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 transition-colors" onClick={resetAllReceiptFilters}>
                    Reset all
                  </button>
                )}
              </div>
              <span className="text-slate-500 font-mono text-[11px]" id="filterCountIndicator">
                {pagination ? `Showing ${rows.length} of ${formatQty(pagination.total)} records` : 'Loading records...'}
              </span>
            </div>
          </div>

          {actionError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {actionError}
              </span>
              <button className="p-0.5 rounded text-rose-500 hover:text-rose-700" onClick={() => setActionError(null)}>
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          {/* MAIN DATA DISPLAY TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
            {/* Card Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Incoming Shipments &amp; Receipt Records</h2>
                  <p className="text-[11px] text-slate-400">Validated receipts are posted to the append-only stock ledger</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Append-only Ledger
              </span>
            </div>
            {/* Table Container */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4" scope="col">Reference</th>
                    <th className="py-3 px-4" scope="col">Supplier</th>
                    <th className="py-3 px-4" scope="col">Destination Staging</th>
                    <th className="py-3 px-4" scope="col">Items</th>
                    <th className="py-3 px-4 text-right" scope="col">Quantity</th>
                    <th className="py-3 px-4 text-center" scope="col">Status</th>
                    <th className="py-3 px-4" scope="col">Receipt Date</th>
                    <th className="py-3 px-4 text-right" scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody className={isLoading && rows.length > 0 ? 'divide-y divide-slate-100 font-sans opacity-60 transition-opacity' : 'divide-y divide-slate-100 font-sans'} id="receiptsTableBody">
                  {renderTableState()}
                </tbody>
              </table>
            </div>
            {/* Pagination & Ledger Footer */}
            <div className="p-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Only validated receipts change stock. Each validation writes one stock ledger entry per line.</span>
              </div>
              {!loadError && pagination && pagination.total > 0 && (
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-500">{`Showing ${firstShown}–${lastShown} of ${formatQty(pagination.total)} receipts`}</span>
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-40 transition-colors" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} title="Previous Page">
                      <span className="material-symbols-outlined text-[15px]">chevron_left</span>
                    </button>
                    <span className="px-2 py-0.5 rounded font-mono font-semibold bg-white border border-slate-200 text-indigo-700 shadow-xs">{shownPage}</span>
                    <span className="text-slate-400 font-mono">/ {totalPages}</span>
                    <button className="p-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-40 transition-colors" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} title="Next Page">
                      <span className="material-symbols-outlined text-[15px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* QUICK VALIDATE MODAL (Atomic Ledger Posting) */}
      {validateTarget && <ValidateModal error={validateError} isPosting={isPosting} onClose={closeValidateModal} onConfirm={confirmReceiptValidation} receipt={validateTarget} />}
    </>
  )
}
