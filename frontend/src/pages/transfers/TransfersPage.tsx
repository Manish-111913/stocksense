import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { cancelTransfer, checkTransferAvailability, confirmTransfer, exportTransfersCsv, getTransfer, getTransferSummary, listTransfers, validateTransfer, type TransferFilters } from '../../api/transfers.ts'
import { DOCUMENT_STATUS_LABEL, type DocumentStatus, type Paginated, type Transfer, type TransferStockChange, type TransferSummary, type Warehouse } from '../../api/types.ts'
import { listWarehouses } from '../../api/warehouses.ts'
import { usePillAction } from '../../context/pillActions.ts'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { ROUTES } from '../../routes.ts'
import { errorMessage, formatQty, useDebouncedValue } from '../products/productsData.ts'
import { DetailPanel } from './components/DetailPanel.tsx'
import { FilterSelect } from './components/FilterSelect.tsx'
import { KpiCard } from './components/KpiCard.tsx'
import { NewTransferModal } from './components/NewTransferModal.tsx'
import { TransferRow } from './components/TransferRow.tsx'
import { ValidateModal } from './components/ValidateModal.tsx'
import { DATE_OPTIONS, dateRangeFor, KPI_CARDS, linesLabel, shortLineCount, STATUS_OPTIONS, stockChangeSummary, type DatePreset, type SelectOption } from './data.ts'

const PAGE_SIZE = 10
const TABLE_COLUMNS = 8

const CHIP = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-200/80'
const RIBBON_ACTIVE = 'px-2.5 py-1 rounded-md font-semibold bg-indigo-600 text-white shadow-xs flex items-center gap-1 transition-all'
const RIBBON_IDLE = 'px-2.5 py-1 rounded-md font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1'

/** Result of the last validation, shown as a banner above the table */
interface ValidationResult {
  reference: string
  changes: TransferStockChange[]
}

export default function TransfersPage() {
  useDocumentTitle('StockSense — Internal Transfers')
  const navigate = useNavigate()
  const { showToast } = useToast()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [result, setResult] = useState<Paginated<Transfer> | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  // Key of the last request that settled; anything else means a request is in flight
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const [summary, setSummary] = useState<TransferSummary | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null)

  // Create / edit modal (null = closed, { editing: null } = new transfer)
  const [form, setForm] = useState<{ editing: Transfer | null; key: number } | null>(null)

  const [validateTarget, setValidateTarget] = useState<Transfer | null>(null)
  const [validateError, setValidateError] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)

  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detail, setDetail] = useState<Transfer | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const detailId = detail?.id ?? null

  const currentFilters = useMemo<TransferFilters>(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      warehouseId: warehouseFilter || undefined,
      ...dateRangeFor(datePreset),
    }),
    [debouncedSearch, statusFilter, warehouseFilter, datePreset],
  )
  const hasFilters = Boolean(search.trim() || statusFilter || warehouseFilter || datePreset)
  const requestKey = `${JSON.stringify(currentFilters)}|${page}|${reloadKey}`
  const isLoading = settledKey !== requestKey
  const loadError = isLoading ? null : fetchError

  // Warehouse filter options
  useEffect(() => {
    listWarehouses({ limit: 100 })
      .then((res) => setWarehouses(res.data))
      .catch(() => setWarehouses([]))
  }, [])

  // Transfers page for the current filters
  useEffect(() => {
    let cancelled = false
    listTransfers({ ...currentFilters, page, limit: PAGE_SIZE })
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
        setFetchError(errorMessage(err, 'Could not load transfers. Please try again.'))
        setSettledKey(requestKey)
      })
    return () => {
      cancelled = true
    }
  }, [currentFilters, page, requestKey])

  // KPI cards
  useEffect(() => {
    let cancelled = false
    getTransferSummary()
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

  // Keep the open detail panel in sync after every action
  useEffect(() => {
    if (!detailId || !isDetailOpen) return
    let cancelled = false
    getTransfer(detailId)
      .then((res) => {
        if (cancelled) return
        setDetail(res)
        setDetailError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setDetailError(errorMessage(err, 'Could not load the transfer.'))
      })
    return () => {
      cancelled = true
    }
  }, [detailId, isDetailOpen, reloadKey])

  // ⌘F / Ctrl+F focuses the transfer search
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

  function openNewTransferModal() {
    setForm({ editing: null, key: Date.now() })
  }

  function openEditModal(transfer: Transfer) {
    setForm({ editing: transfer, key: Date.now() })
  }

  usePillAction('new-transfer', openNewTransferModal)

  function updateFilter(apply: () => void) {
    apply()
    setPage(1)
  }

  // Status filter from the KPI cards (clicking the selected card clears it)
  function filterByStatus(status: DocumentStatus) {
    updateFilter(() => setStatusFilter((current) => (current === status ? '' : status)))
  }

  function resetFilters() {
    setSearch('')
    setStatusFilter('')
    setWarehouseFilter('')
    setDatePreset('')
    setPage(1)
  }

  function openDetailPanel(transfer: Transfer) {
    setDetail(transfer)
    setDetailError(null)
    setIsDetailOpen(true)
  }

  function closeDetailPanel() {
    setIsDetailOpen(false)
  }

  async function runAction(transfer: Transfer, action: (id: string) => Promise<Transfer>, onDone: (updated: Transfer) => void, fallback: string) {
    setBusyId(transfer.id)
    setActionError(null)
    try {
      onDone(await action(transfer.id))
    } catch (err) {
      setActionError(errorMessage(err, fallback))
    } finally {
      setBusyId(null)
      // Refetch either way: a failed action usually means the transfer changed elsewhere
      refresh()
    }
  }

  function showReadiness(updated: Transfer) {
    if (updated.status === 'READY') showToast('Transfer Ready', `${updated.reference} is ready to validate.`)
    else showToast('Transfer Waiting', `${updated.reference} is waiting: the source is short on ${linesLabel(shortLineCount(updated))}.`)
  }

  function handleConfirm(transfer: Transfer) {
    void runAction(transfer, confirmTransfer, showReadiness, 'Could not confirm the transfer. Please try again.')
  }

  function handleCheckAvailability(transfer: Transfer) {
    void runAction(transfer, checkTransferAvailability, showReadiness, 'Could not check availability. Please try again.')
  }

  function handleCancel(transfer: Transfer) {
    if (!window.confirm(`Cancel transfer ${transfer.reference}? It will be kept as Canceled and no stock will move. This can't be undone.`)) return
    void runAction(transfer, cancelTransfer, (updated) => showToast('Transfer Canceled', `${updated.reference} has been canceled.`), 'Could not cancel the transfer. Please try again.')
  }

  function handleEdit(transfer: Transfer) {
    closeDetailPanel()
    openEditModal(transfer)
  }

  function openValidateModal(transfer: Transfer) {
    closeDetailPanel()
    setValidateError(null)
    setValidateTarget(transfer)
  }

  function closeValidateModal() {
    if (isPosting) return
    setValidateTarget(null)
    setValidateError(null)
  }

  async function confirmTransferValidation() {
    if (!validateTarget) return
    const target = validateTarget
    setIsPosting(true)
    setValidateError(null)
    try {
      const validated = await validateTransfer(target.id)
      setValidateTarget(null)
      setLastValidation({ reference: validated.reference, changes: validated.stockChanges })
      const changes = stockChangeSummary(validated.stockChanges)
      showToast('Transfer Validated', `${validated.reference} posted to the Stock Ledger.${changes ? ` ${changes}` : ''}`)
    } catch (err) {
      // e.g. 409 INSUFFICIENT_STOCK: nothing moved; show why and reload the transfer's availability
      setValidateError(errorMessage(err, 'Could not validate the transfer. Please try again.'))
      getTransfer(target.id)
        .then((fresh) => setValidateTarget((current) => (current?.id === fresh.id ? fresh : current)))
        .catch(() => undefined)
    } finally {
      setIsPosting(false)
      refresh()
    }
  }

  async function exportTransfersCSV() {
    setIsExporting(true)
    setActionError(null)
    try {
      await exportTransfersCsv(currentFilters)
      showToast('Export Finished', 'StockSense_Transfers.csv downloaded.')
    } catch (err) {
      setActionError(errorMessage(err, 'Could not export transfers. Please try again.'))
    } finally {
      setIsExporting(false)
    }
  }

  const warehouseName = warehouses.find((w) => w.id === warehouseFilter)?.name
  const dateLabel = DATE_OPTIONS.find((o) => o.value === datePreset)?.label
  const warehouseSelectOptions: SelectOption[] = [{ value: '', label: 'All Warehouses' }, ...warehouses.map((w) => ({ value: w.id, label: w.status === 'ACTIVE' ? w.name : `${w.name} (inactive)` }))]

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
            <p className="text-sm font-semibold text-slate-800">Couldn&apos;t load transfers</p>
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
            Loading transfers...
          </td>
        </tr>
      )
    }
    if (rows.length === 0) {
      return (
        <tr>
          <td className="py-14 px-4 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">{hasFilters ? 'search_off' : 'sync_alt'}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">{hasFilters ? 'No transfers match your filters' : 'No transfers yet'}</p>
            <p className="text-xs text-slate-500 mt-1">{hasFilters ? 'Try a different search term or reset the filters.' : 'Create your first transfer to move stock between locations.'}</p>
            {hasFilters ? (
              <button className="mt-4 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs inline-flex items-center gap-1.5 transition-all" onClick={resetFilters}>
                <span className="material-symbols-outlined text-[16px] text-slate-500">restart_alt</span>
                <span>Reset Filters</span>
              </button>
            ) : (
              <button className="mt-4 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-[0.98]" onClick={openNewTransferModal}>
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>New Transfer</span>
              </button>
            )}
          </td>
        </tr>
      )
    }
    return rows.map((transfer) => (
      <TransferRow
        isBusy={busyId === transfer.id}
        key={transfer.id}
        onCancel={handleCancel}
        onCheckAvailability={handleCheckAvailability}
        onConfirm={handleConfirm}
        onEdit={handleEdit}
        onOpenDetail={openDetailPanel}
        onValidate={openValidateModal}
        transfer={transfer}
      />
    ))
  }

  function renderChip(label: string, onClear: () => void) {
    return (
      <span className={CHIP} key={label}>
        {label}
        <button className="flex items-center hover:text-indigo-900" onClick={() => updateFilter(onClear)} title="Remove filter">
          <span className="material-symbols-outlined text-[13px]">close</span>
        </button>
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
            <span className="text-[11px] font-normal text-indigo-700 hidden sm:inline">Stock movements between internal locations</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] bg-white p-0.5 rounded-lg border border-indigo-200/70 shadow-xs">
            <button className={statusFilter === 'READY' ? RIBBON_ACTIVE : RIBBON_IDLE} onClick={() => updateFilter(() => setStatusFilter('READY'))}>
              <span className="material-symbols-outlined text-[13px]">visibility</span> Ready to Validate
            </button>
            <button className={statusFilter === '' ? RIBBON_ACTIVE : RIBBON_IDLE} onClick={() => updateFilter(() => setStatusFilter(''))}>
              <span className="material-symbols-outlined text-[13px]">list</span> All Records
            </button>
            <button className={RIBBON_IDLE} onClick={openNewTransferModal}>
              <span className="material-symbols-outlined text-[13px]">add</span> Draft Transfer
            </button>
          </div>
        </div>
        {/* Breadcrumbs & Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors cursor-pointer" onClick={() => navigate(ROUTES.dashboard)}>
                <span className="material-symbols-outlined text-[15px]">sync_alt</span>
                <span>Operations</span>
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800">Transfers</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Internal Transfers</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Inter-Hub Movement
              </span>
              <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{activeCount === null ? '— Active' : `${formatQty(activeCount)} Active`}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Move inventory between warehouses and locations without altering total company stock.</p>
          </div>
          {/* Header Actions */}
          <div className="flex items-center gap-2.5">
            <button className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-60" disabled={isExporting} onClick={exportTransfersCSV}>
              <span className={isExporting ? 'material-symbols-outlined text-[16px] text-slate-500 animate-spin' : 'material-symbols-outlined text-[16px] text-slate-500'}>{isExporting ? 'progress_activity' : 'download'}</span>
              <span>Export CSV</span>
            </button>
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98]" onClick={openNewTransferModal}>
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>New Transfer</span>
            </button>
          </div>
        </div>
        {/* 5 Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {KPI_CARDS.map((card) => (
            <KpiCard active={statusFilter === card.status} card={card} count={summary ? summary[card.status] : null} key={card.status} onSelect={filterByStatus} />
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
                id="transfersSearchInput"
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
              <FilterSelect id="statusFilterSelect" onChange={(value) => updateFilter(() => setStatusFilter(value as DocumentStatus | ''))} options={STATUS_OPTIONS} value={statusFilter} />
              <FilterSelect id="warehouseFilterSelect" onChange={(value) => updateFilter(() => setWarehouseFilter(value))} options={warehouseSelectOptions} value={warehouseFilter} />
              <FilterSelect id="dateFilterSelect" onChange={(value) => updateFilter(() => setDatePreset(value as DatePreset))} options={DATE_OPTIONS} value={datePreset} />
              <button className="text-xs font-medium text-slate-500 hover:text-indigo-600 px-2 py-1.5 flex items-center gap-1 transition-colors" onClick={resetFilters}>
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                <span>Reset</span>
              </button>
            </div>
          </div>
          {/* Active Filter Tags & Count Summary */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 text-[11px]">Active filters:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">Scope: Internal Movements</span>
              {search.trim() && renderChip(`Search: "${search.trim()}"`, () => setSearch(''))}
              {statusFilter && renderChip(`Status: ${DOCUMENT_STATUS_LABEL[statusFilter]}`, () => setStatusFilter(''))}
              {warehouseFilter && renderChip(`Warehouse: ${warehouseName ?? '…'}`, () => setWarehouseFilter(''))}
              {datePreset && renderChip(`Date: ${dateLabel ?? datePreset}`, () => setDatePreset(''))}
            </div>
            <span className="text-slate-500 font-mono text-[11px] whitespace-nowrap">{pagination ? `Showing ${rows.length} of ${formatQty(pagination.total)} records` : 'Loading records...'}</span>
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

        {/* Last validation: source / destination before → after */}
        {lastValidation && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">task_alt</span>
              <div className="space-y-1 min-w-0">
                <div className="font-semibold">{`${lastValidation.reference} validated. Stock moved:`}</div>
                {lastValidation.changes.map((change) => (
                  <div className="font-mono text-[11px] text-emerald-800" key={change.productId}>
                    {`${change.sku} · ${formatQty(change.quantity)} ${change.unitOfMeasure} · source ${formatQty(change.source.before)} → ${formatQty(change.source.after)} · destination ${formatQty(change.destination.before)} → ${formatQty(change.destination.after)}`}
                  </div>
                ))}
              </div>
            </div>
            <button className="p-0.5 rounded text-emerald-600 hover:text-emerald-800" onClick={() => setLastValidation(null)}>
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Main Internal Transfers Data Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Header of Table Card */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Internal Movement &amp; Transfer Records</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Append-only Ledger
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Each validated transfer writes an OUT entry at the source and an IN entry at the destination for every line.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-500 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                Source: −
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Dest: +
              </span>
            </div>
          </div>
          {/* Crisp Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Reference</th>
                  <th className="py-3 px-5">From (Source)</th>
                  <th className="py-3 px-5">To (Destination)</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-5 text-right">Quantity</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-5">Transfer Date</th>
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
              <span>Only validated transfers move stock. Total company stock remains unchanged; only location balances shift.</span>
            </div>
            {!loadError && pagination && pagination.total > 0 && (
              <div className="flex items-center gap-3 font-mono">
                <span>{`Showing ${firstShown}–${lastShown} of ${formatQty(pagination.total)} transfers`}</span>
                <div className="flex items-center gap-1">
                  <button className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors shadow-2xs disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} type="button">
                    <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                  </button>
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-semibold text-[10px]">{shownPage}</span>
                  <span className="text-slate-400">/</span>
                  <span className="px-2 py-0.5 text-slate-600 text-[10px]">{totalPages}</span>
                  <button className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors shadow-2xs disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} type="button">
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* SLIDE-OVER DRAWER: Transfer Detail View Panel */}
      <DetailPanel
        error={detailError}
        isBusy={detail !== null && busyId === detail.id}
        onCancel={handleCancel}
        onCheckAvailability={handleCheckAvailability}
        onClose={closeDetailPanel}
        onConfirm={handleConfirm}
        onEdit={handleEdit}
        onRetry={refresh}
        onValidate={openValidateModal}
        open={isDetailOpen}
        transfer={detail}
      />

      {/* MODAL 1: Create / Edit Internal Transfer */}
      {form && <NewTransferModal editing={form.editing} key={form.key} onClose={() => setForm(null)} onSaved={refresh} />}

      {/* MODAL 2: Validation Confirmation Dialog */}
      {validateTarget && <ValidateModal error={validateError} isPosting={isPosting} onClose={closeValidateModal} onConfirm={confirmTransferValidation} transfer={validateTarget} />}
    </>
  )
}
