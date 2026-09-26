import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cancelDelivery, checkDeliveryAvailability, confirmDelivery, exportDeliveriesCsv, getDeliverySummary, listCustomers, listDeliveries, packDelivery, pickDelivery, validateDelivery, type DeliveryFilters } from '../../api/deliveries.ts'
import { DOCUMENT_STATUS_LABEL, type Customer, type Delivery, type DeliverySummary, type DocumentStatus, type Location, type Paginated, type StockChangeLine, type Warehouse } from '../../api/types.ts'
import { listLocations, listWarehouses } from '../../api/warehouses.ts'
import { usePillAction } from '../../context/pillActions.ts'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { errorMessage, formatQty, useDebouncedValue } from '../products/productsData.ts'
import { DATE_OPTIONS, dateRangeFor, STATUS_OPTIONS, type DatePreset, type SelectOption } from '../receipts/list/receiptsData.ts'
import { DeliveryDetailView } from './components/DeliveryDetailView.tsx'
import { DeliveryRow } from './components/DeliveryRow.tsx'
import { DeliveryValidateModal } from './components/DeliveryValidateModal.tsx'
import { NewDeliveryView } from './components/NewDeliveryView.tsx'
import { isInsufficientStock, KPI_CARD_ACTIVE, KPI_CARD_INACTIVE, KPI_CARDS, type DeliveryView } from './data.ts'

const PAGE_SIZE = 10
const TABLE_COLUMNS = 9

const SELECT_CLASS = 'w-full py-2 px-3 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-700 font-label-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
const CHIP = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/80 border border-indigo-200 text-indigo-800 text-[11px] font-semibold'

function renderOptions(options: SelectOption[]) {
  return options.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))
}

/** "SKU: 10 → 5 PCS" for the first few lines, then "+N more" */
function stockChangeSummary(changes: StockChangeLine[]) {
  const shown = changes.slice(0, 2).map((c) => `${c.sku}: ${formatQty(c.before)} → ${formatQty(c.after)} ${c.unitOfMeasure}`)
  if (changes.length > 2) shown.push(`+${changes.length - 2} more`)
  return shown.join(', ')
}

export default function DeliveriesPage() {
  useDocumentTitle('StockSense — Delivery Orders')
  const { showToast } = useToast()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [view, setView] = useState<DeliveryView>({ kind: 'list' })

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [result, setResult] = useState<Paginated<Delivery> | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  // Key of the last request that settled; anything else means a request is in flight
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const [summary, setSummary] = useState<DeliverySummary | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const [validateTarget, setValidateTarget] = useState<Delivery | null>(null)
  const [validateError, setValidateError] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)

  const currentFilters = useMemo<DeliveryFilters>(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      customerId: customerFilter || undefined,
      warehouseId: warehouseFilter || undefined,
      sourceLocationId: locationFilter || undefined,
      ...dateRangeFor(datePreset),
    }),
    [debouncedSearch, statusFilter, customerFilter, warehouseFilter, locationFilter, datePreset],
  )
  const hasFilters = Boolean(search.trim() || statusFilter || customerFilter || warehouseFilter || locationFilter || datePreset)
  const requestKey = `${JSON.stringify(currentFilters)}|${page}|${reloadKey}`
  const isLoading = settledKey !== requestKey
  const loadError = isLoading ? null : fetchError

  // Filter dropdown sources (refetched with the list, so records created meanwhile show up)
  useEffect(() => {
    listCustomers()
      .then(setCustomers)
      .catch(() => setCustomers([]))
    listWarehouses({ limit: 100 })
      .then((res) => setWarehouses(res.data))
      .catch(() => setWarehouses([]))
    listLocations()
      .then(setLocations)
      .catch(() => setLocations([]))
  }, [reloadKey])

  // Deliveries page for the current filters
  useEffect(() => {
    let cancelled = false
    listDeliveries({ ...currentFilters, page, limit: PAGE_SIZE })
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
        setFetchError(errorMessage(err, 'Could not load deliveries. Please try again.'))
        setSettledKey(requestKey)
      })
    return () => {
      cancelled = true
    }
  }, [currentFilters, page, requestKey])

  // KPI cards
  useEffect(() => {
    let cancelled = false
    getDeliverySummary()
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

  // ⌘F / Ctrl+F focuses the delivery search (list view only)
  const isList = view.kind === 'list'
  useEffect(() => {
    if (!isList) return
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isList])

  const refresh = useCallback(() => setReloadKey((key) => key + 1), [])

  /* ---------- View switching ---------- */

  function switchDeliveryView(next: DeliveryView) {
    setView(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function backToList() {
    switchDeliveryView({ kind: 'list' })
    refresh()
  }

  usePillAction('new-delivery', () => switchDeliveryView({ kind: 'form', id: null }))


  /* ---------- Filters ---------- */

  const locationOptions = warehouseFilter ? locations.filter((location) => location.warehouse.id === warehouseFilter) : locations
  const customerName = customers.find((c) => c.id === customerFilter)?.name
  const warehouseName = warehouses.find((w) => w.id === warehouseFilter)?.name
  const locationName = locations.find((l) => l.id === locationFilter)?.name
  const dateLabel = DATE_OPTIONS.find((o) => o.value === datePreset)?.label

  const customerSelectOptions: SelectOption[] = [{ value: '', label: 'All Customers' }, ...customers.map((c) => ({ value: c.id, label: c.status === 'ACTIVE' ? c.name : `${c.name} (inactive)` }))]
  const warehouseSelectOptions: SelectOption[] = [{ value: '', label: 'All Warehouses' }, ...warehouses.map((w) => ({ value: w.id, label: w.name }))]
  const locationSelectOptions: SelectOption[] = [
    { value: '', label: 'All Source Locations' },
    ...locationOptions.map((l) => ({ value: l.id, label: warehouseFilter ? l.name : `${l.warehouse.code} / ${l.name}` })),
  ]

  function updateFilter(apply: () => void) {
    apply()
    setPage(1)
  }

  // Status filter from the KPI cards (clicking the selected card clears it)
  function filterByDeliveryStatus(status: DocumentStatus) {
    updateFilter(() => setStatusFilter((current) => (current === status ? '' : status)))
  }

  function changeWarehouse(value: string) {
    updateFilter(() => {
      setWarehouseFilter(value)
      // Keep the location only if it belongs to the chosen warehouse
      if (value && locationFilter && locations.find((l) => l.id === locationFilter)?.warehouse.id !== value) setLocationFilter('')
    })
  }

  function resetDeliveryFilters() {
    setSearch('')
    setStatusFilter('')
    setCustomerFilter('')
    setWarehouseFilter('')
    setLocationFilter('')
    setDatePreset('')
    setPage(1)
  }

  /* ---------- Row actions ---------- */

  async function runAction(delivery: Delivery, action: (id: string) => Promise<Delivery>, describe: (updated: Delivery) => [string, string], fallback: string) {
    setBusyId(delivery.id)
    setActionError(null)
    try {
      const updated = await action(delivery.id)
      const [title, subtitle] = describe(updated)
      showToast(title, subtitle)
    } catch (err) {
      setActionError(errorMessage(err, fallback))
    } finally {
      setBusyId(null)
      // Refetch either way: a failed action usually means the delivery changed elsewhere
      refresh()
    }
  }

  function handleConfirm(delivery: Delivery) {
    void runAction(
      delivery,
      confirmDelivery,
      (d) => (d.status === 'READY' ? ['Delivery Confirmed', `${d.reference} is ready: every line is in stock.`] : ['Delivery Waiting', `${d.reference} is waiting: some lines are short on stock.`]),
      'Could not confirm the delivery. Please try again.',
    )
  }

  function handleCheckAvailability(delivery: Delivery) {
    void runAction(
      delivery,
      checkDeliveryAvailability,
      (d) => (d.status === 'READY' ? ['Stock Available', `${d.reference} is now ready to pick.`] : ['Still Waiting', `${d.reference} is still short on stock.`]),
      'Could not check availability. Please try again.',
    )
  }

  function handlePick(delivery: Delivery) {
    void runAction(delivery, pickDelivery, (d) => ['Delivery Picked', `${d.reference} was picked. Pack it next.`], 'Could not mark the delivery as picked. Please try again.')
  }

  function handlePack(delivery: Delivery) {
    void runAction(delivery, packDelivery, (d) => ['Delivery Packed', `${d.reference} was packed and can be validated.`], 'Could not mark the delivery as packed. Please try again.')
  }

  function handleCancel(delivery: Delivery) {
    if (!window.confirm(`Cancel delivery ${delivery.reference}? It will be kept as Canceled and no stock will move. This can't be undone.`)) return
    void runAction(delivery, cancelDelivery, (d) => ['Delivery Canceled', `${d.reference} has been canceled. No stock moved.`], 'Could not cancel the delivery. Please try again.')
  }

  /* ---------- Validate modal ---------- */

  function openValidateModal(delivery: Delivery) {
    setValidateError(null)
    setValidateTarget(delivery)
  }

  function closeDeliveryValidateModal() {
    if (isPosting) return
    setValidateTarget(null)
    setValidateError(null)
  }

  async function confirmDeliveryValidation() {
    if (!validateTarget) return
    setIsPosting(true)
    setValidateError(null)
    try {
      const validated = await validateDelivery(validateTarget.id)
      setValidateTarget(null)
      const changes = stockChangeSummary(validated.stockChanges)
      showToast('Delivery Validated', `${validated.reference} shipped; stock decreased.${changes ? ` ${changes}` : ''}`)
    } catch (err) {
      setValidateError(isInsufficientStock(err) ? `Validation blocked, nothing changed. ${errorMessage(err)}` : errorMessage(err, 'Could not validate the delivery. Please try again.'))
    } finally {
      setIsPosting(false)
      refresh()
    }
  }

  async function exportDeliveriesCSV() {
    setIsExporting(true)
    setActionError(null)
    try {
      await exportDeliveriesCsv(currentFilters)
      showToast('Export Finished', 'StockSense_Deliveries.csv downloaded.')
    } catch (err) {
      setActionError(errorMessage(err, 'Could not export deliveries. Please try again.'))
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
  const activeCount = summary ? summary.DRAFT + summary.WAITING + summary.READY : null

  function renderTableState() {
    if (loadError) {
      return (
        <tr>
          <td className="py-14 px-4 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">error</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">Couldn&apos;t load deliveries</p>
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
            Loading deliveries...
          </td>
        </tr>
      )
    }
    if (rows.length === 0) {
      return (
        <tr>
          <td className="py-14 px-4 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">{hasFilters ? 'search_off' : 'local_shipping'}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{hasFilters ? 'No deliveries match your filters' : 'No deliveries yet'}</p>
            <p className="text-xs text-slate-500 mt-1">{hasFilters ? 'Try a different search term or reset the filters.' : 'Create your first delivery to ship stock out to a customer.'}</p>
            {hasFilters ? (
              <button className="mt-4 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs inline-flex items-center gap-1.5 transition-all" onClick={resetDeliveryFilters}>
                <span className="material-symbols-outlined text-[16px] text-slate-500">restart_alt</span>
                <span>Reset Filters</span>
              </button>
            ) : (
              <button className="mt-4 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-[0.98]" onClick={() => switchDeliveryView({ kind: 'form', id: null })}>
                <span className="material-symbols-outlined text-[17px]">add_circle</span>
                <span>New Delivery</span>
              </button>
            )}
          </td>
        </tr>
      )
    }
    return rows.map((delivery) => (
      <DeliveryRow
        delivery={delivery}
        isBusy={busyId === delivery.id}
        key={delivery.id}
        onCancel={handleCancel}
        onCheckAvailability={handleCheckAvailability}
        onConfirm={handleConfirm}
        onEdit={(d) => switchDeliveryView({ kind: 'form', id: d.id })}
        onOpen={(d) => switchDeliveryView({ kind: 'detail', id: d.id })}
        onPack={handlePack}
        onPick={handlePick}
        onValidate={openValidateModal}
      />
    ))
  }

  function renderChip(label: string, onClear: () => void) {
    return (
      <span className={CHIP} key={label}>
        <span>{label}</span>
        <button className="hover:text-indigo-950 font-bold" onClick={() => updateFilter(onClear)} title="Remove filter">
          ×
        </button>
      </span>
    )
  }

  return (
    <main className="w-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-7 transition-all duration-150" id="view-receipts-main">
      <div className="flex flex-col w-full">
        {/* Interactive View State Controller & Operational Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200/80">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
              <span>Operations</span>
              <span className="text-slate-300">/</span>
              <button className="text-indigo-600 font-semibold uppercase hover:text-indigo-800" onClick={backToList}>
                Deliveries
              </button>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Delivery Orders</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Outbound Shipments</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">{activeCount === null ? '— Active' : `${formatQty(activeCount)} Active`}</span>
            </div>
            <p className="text-sm text-slate-500 max-w-2xl">Track outgoing customer shipments, warehouse pick-pack verification, and atomic stock ledger postings.</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {isList && (
              <button className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-60" disabled={isExporting} onClick={exportDeliveriesCSV}>
                <span className={isExporting ? 'material-symbols-outlined text-[16px] animate-spin' : 'material-symbols-outlined text-[16px]'}>{isExporting ? 'progress_activity' : 'download'}</span>
                <span>Export CSV</span>
              </button>
            )}
            {!isList && (
              <button className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all" onClick={backToList}>
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>All Deliveries</span>
              </button>
            )}
            <button className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all" onClick={() => switchDeliveryView({ kind: 'form', id: null })}>
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>+ New Delivery</span>
            </button>
          </div>
        </div>

        {/* VIEW 1: DELIVERY ORDERS DIRECTORY (/deliveries) — stays mounted so filters survive a detour */}
        <div className={isList ? 'flex flex-col space-y-6 pt-6' : 'flex flex-col space-y-6 pt-6 hidden'} id="viewDeliveryList">
          {/* 5 KPI Summary Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {KPI_CARDS.map((card) => (
              <div className={card.status === statusFilter ? KPI_CARD_ACTIVE : KPI_CARD_INACTIVE} data-status-card={card.status} key={card.status} onClick={() => filterByDeliveryStatus(card.status)}>
                <div className="flex items-center justify-between pb-1">
                  <span className={card.labelClass}>{DOCUMENT_STATUS_LABEL[card.status]}</span>
                  <div className={card.iconClass}>
                    <span className="material-symbols-outlined text-[17px]">{card.icon}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={card.countClass}>{summary ? formatQty(summary[card.status]) : '—'}</span>
                  <span className={card.unitClass}>{card.unit}</span>
                </div>
                <div className={card.footClass}>
                  <span>{card.caption}</span>
                  <span className={card.badgeClass}>{card.badge}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Search & Filter Bar Controls */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search Input */}
              <div className="md:col-span-3 relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                <input
                  className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50/70 border border-slate-200/90 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-body-sm"
                  id="deliverySearchInput"
                  onChange={(e) => updateFilter(() => setSearch(e.target.value))}
                  placeholder="Search by reference or customer... (⌘F)"
                  ref={searchInputRef}
                  type="text"
                  value={search}
                />
                <kbd className="absolute right-2.5 top-2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">⌘F</kbd>
              </div>
              {/* Filter Dropdown: Status */}
              <div className="md:col-span-2">
                <select className={SELECT_CLASS} id="filterDeliveryStatus" onChange={(e) => updateFilter(() => setStatusFilter(e.target.value as DocumentStatus | ''))} value={statusFilter}>
                  {renderOptions(STATUS_OPTIONS)}
                </select>
              </div>
              {/* Filter Dropdown: Customer */}
              <div className="md:col-span-2">
                <select className={SELECT_CLASS} id="filterDeliveryCustomer" onChange={(e) => updateFilter(() => setCustomerFilter(e.target.value))} value={customerFilter}>
                  {renderOptions(customerSelectOptions)}
                </select>
              </div>
              {/* Filter Dropdown: Warehouse */}
              <div className="md:col-span-2">
                <select className={SELECT_CLASS} id="filterDeliveryWarehouse" onChange={(e) => changeWarehouse(e.target.value)} value={warehouseFilter}>
                  {renderOptions(warehouseSelectOptions)}
                </select>
              </div>
              {/* Filter Dropdown: Source Location */}
              <div className="md:col-span-1">
                <select className={SELECT_CLASS} id="filterDeliveryLocation" onChange={(e) => updateFilter(() => setLocationFilter(e.target.value))} value={locationFilter}>
                  {renderOptions(locationSelectOptions)}
                </select>
              </div>
              {/* Date Range & Reset */}
              <div className="md:col-span-2 flex items-center gap-2">
                <select
                  className="flex-1 py-2 px-2.5 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-700 font-label-md focus:outline-none focus:border-indigo-500"
                  id="filterDeliveryDate"
                  onChange={(e) => updateFilter(() => setDatePreset(e.target.value as DatePreset))}
                  value={datePreset}
                >
                  {renderOptions(DATE_OPTIONS)}
                </select>
                <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors" onClick={resetDeliveryFilters} title="Reset all filters">
                  <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
                </button>
              </div>
            </div>
            {/* Active Filter Chips */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-label-sm uppercase tracking-wider text-[10px]">Active Filters:</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-[11px] font-semibold">
                  <span>Scope: Outbound Shipments</span>
                </span>
                {search.trim() && renderChip(`Search: "${search.trim()}"`, () => setSearch(''))}
                {statusFilter && renderChip(`Status: ${DOCUMENT_STATUS_LABEL[statusFilter]}`, () => setStatusFilter(''))}
                {customerFilter && renderChip(`Customer: ${customerName ?? '…'}`, () => setCustomerFilter(''))}
                {warehouseFilter && renderChip(`Warehouse: ${warehouseName ?? '…'}`, () => setWarehouseFilter(''))}
                {locationFilter && renderChip(`Location: ${locationName ?? '…'}`, () => setLocationFilter(''))}
                {datePreset && renderChip(`Date: ${dateLabel ?? datePreset}`, () => setDatePreset(''))}
                {hasFilters && (
                  <button className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 transition-colors" onClick={resetDeliveryFilters}>
                    Reset all
                  </button>
                )}
                <span className="text-slate-400 text-[11px]" id="chipCountIndicator">
                  {pagination ? `Showing ${rows.length} of ${formatQty(pagination.total)} records` : 'Loading records...'}
                </span>
              </div>
              <button className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs inline-flex items-center gap-1" onClick={() => switchDeliveryView({ kind: 'form', id: null })}>
                <span className="material-symbols-outlined text-[15px]">add_box</span>
                <span>Draft New Outbound</span>
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

          {/* DELIVERIES DATA TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:px-6 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100/90 text-indigo-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Outgoing Shipments &amp; Delivery Records</h3>
                  <p className="text-xs text-slate-500">Validated deliveries are posted to the append-only stock ledger</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Append-only Ledger</span>
                </span>
              </div>
            </div>
            <div className="overflow-x-auto custom-scroll">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-label-sm uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4 font-semibold">Reference</th>
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-4 font-semibold">Warehouse &amp; Source</th>
                    <th className="py-3 px-3 font-semibold text-center">Lines</th>
                    <th className="py-3 px-4 font-semibold text-right">Quantity</th>
                    <th className="py-3 px-4 font-semibold text-center">Availability</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold">Delivery Date</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={isLoading && rows.length > 0 ? 'divide-y divide-slate-100 text-xs text-slate-700 font-body-sm opacity-60 transition-opacity' : 'divide-y divide-slate-100 text-xs text-slate-700 font-body-sm'} id="deliveriesTableBody">
                  {renderTableState()}
                </tbody>
              </table>
            </div>
            {/* Pagination Bar */}
            <div className="p-3.5 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Only validated deliveries decrease stock. Each validation writes one stock ledger entry per line.</span>
              </div>
              {!loadError && pagination && pagination.total > 0 && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[11px] text-slate-400 mr-2">
                    Showing <strong>{`${firstShown}–${lastShown}`}</strong> of <strong>{formatQty(pagination.total)}</strong>
                  </span>
                  <button className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-medium text-[11px] disabled:text-slate-400 disabled:cursor-not-allowed disabled:hover:bg-white" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Previous
                  </button>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold text-[11px]">{shownPage}</span>
                  <span className="px-1 text-slate-400 text-[11px]">/ {totalPages}</span>
                  <button className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-medium text-[11px] disabled:text-slate-400 disabled:cursor-not-allowed disabled:hover:bg-white" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* VIEW 2: CREATE / EDIT DELIVERY ORDER */}
        {view.kind === 'form' && <NewDeliveryView id={view.id} key={view.id ?? 'new'} onClose={backToList} onOpenDetail={(id) => switchDeliveryView({ kind: 'detail', id })} />}

        {/* VIEW 3: DELIVERY DETAIL & WORKFLOW */}
        {view.kind === 'detail' && <DeliveryDetailView id={view.id} key={view.id} onBack={backToList} onEdit={(id) => switchDeliveryView({ kind: 'form', id })} />}

        {/* INTERACTIVE MODAL: VALIDATE DELIVERY ORDER */}
        {validateTarget && <DeliveryValidateModal delivery={validateTarget} error={validateError} isPosting={isPosting} onClose={closeDeliveryValidateModal} onConfirm={confirmDeliveryValidation} />}
      </div>
    </main>
  )
}
