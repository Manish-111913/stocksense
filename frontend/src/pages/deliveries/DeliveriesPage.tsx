import { useEffect, useRef, useState } from 'react'
import { usePillAction } from '../../context/pillActions.ts'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { DeliveryDetailView } from './components/DeliveryDetailView.tsx'
import { DeliveryRow } from './components/DeliveryRow.tsx'
import { DeliveryValidateModal } from './components/DeliveryValidateModal.tsx'
import { NewDeliveryView } from './components/NewDeliveryView.tsx'
import {
  DATE_OPTIONS,
  DELIVERIES_CSV,
  DETAIL_VALIDATE_TARGET,
  INITIAL_DELIVERIES,
  KPI_CARD_ACTIVE,
  KPI_CARD_INACTIVE,
  KPI_CARDS,
  LOCATION_OPTIONS,
  matchesDeliveryFilters,
  pickedValidateTarget,
  STATUS_OPTIONS,
  VALIDATED_LEDGER_ID,
  WAREHOUSE_OPTIONS,
  type Delivery,
  type DeliveryStatus,
  type DeliveryView,
  type SelectOption,
  type StatusFilter,
  type ValidateTarget,
} from './data.ts'

interface DeliveryTable {
  rows: Delivery[]
  /**
   * The original only re-evaluates row visibility when a filter runs. A pick/validation changes a row
   * in place, so its visibility stays tied to the row as it was at the last filter run (kept here)
   */
  staleRows: Record<string, Delivery>
}

function renderOptions(options: SelectOption[]) {
  return options.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))
}

export default function DeliveriesPage() {
  useDocumentTitle('StockSense — Delivery Orders')
  const { showToast } = useToast()

  const [view, setView] = useState<DeliveryView>('list')
  const [detailRef, setDetailRef] = useState('WH/OUT/00184')
  const [table, setTable] = useState<DeliveryTable>({ rows: INITIAL_DELIVERIES, staleRows: {} })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Ready')
  const [warehouseFilter, setWarehouseFilter] = useState('ALL')
  const [locationFilter, setLocationFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('30D')
  // Highlighted KPI card + "Status: X" chip: set only by the KPI cards, cleared by the chip and Reset
  const [pinnedStatus, setPinnedStatus] = useState<DeliveryStatus | null>('Ready')
  const [validateTarget, setValidateTarget] = useState<ValidateTarget | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const [ledgerPosted, setLedgerPosted] = useState(false)
  const postTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(postTimer.current), [])

  const filters = { search, status: statusFilter, warehouse: warehouseFilter, location: locationFilter }
  const isVisible = (d: Delivery) => matchesDeliveryFilters(table.staleRows[d.ref] ?? d, filters)
  const visibleCount = table.rows.filter(isVisible).length

  const breadcrumb = view === 'list' ? '/deliveries' : view === 'new' ? '/deliveries/new' : `/deliveries/${detailRef}`

  // Synchronize view switching
  function switchDeliveryView(next: DeliveryView) {
    setView(next)
  }

  usePillAction('new-delivery', () => switchDeliveryView('new'))

  /* ---------- Filters ---------- */

  // Any filter run re-evaluates every row against its current state
  function handleDeliveryFilters() {
    setTable((t) => ({ ...t, staleRows: {} }))
  }

  function filterByDeliveryStatus(status: StatusFilter) {
    setStatusFilter(status)
    setPinnedStatus(status === 'ALL' ? null : status)
    handleDeliveryFilters()
  }

  function clearStatusChip() {
    filterByDeliveryStatus('ALL')
  }

  function resetDeliveryFilters() {
    setSearch('')
    setWarehouseFilter('ALL')
    setLocationFilter('ALL')
    setDateFilter('30D')
    clearStatusChip()
    showToast('Filters Cleared', 'Reset to display all outbound records.')
  }

  /* ---------- Row updates ---------- */

  function patchRow(ref: string, patch: Partial<Delivery>) {
    setTable(({ rows, staleRows }) => {
      const row = rows.find((r) => r.ref === ref)
      if (!row) return { rows, staleRows }
      return {
        rows: rows.map((r) => (r.ref === ref ? { ...r, ...patch } : r)),
        staleRows: ref in staleRows ? staleRows : { ...staleRows, [ref]: row },
      }
    })
  }

  /* ---------- Validate modal ---------- */

  function openValidateModal(target: ValidateTarget) {
    setValidateTarget(target)
  }

  function closeDeliveryValidateModal() {
    setValidateTarget(null)
  }

  function confirmDeliveryValidation() {
    if (!validateTarget) return
    const { ref } = validateTarget
    setIsPosting(true)

    postTimer.current = window.setTimeout(() => {
      setIsPosting(false)
      closeDeliveryValidateModal()
      showToast('Delivery Validated', `${ref} atomically deducted from inventory.`)
      // Detail screen: banner, step 4 and ledger preview
      setLedgerPosted(true)
      // Matching row in the list
      patchRow(ref, { status: 'Done', actions: { kind: 'done', ledgerId: VALIDATED_LEDGER_ID } })
    }, 700)
  }

  /* ---------- Row and quick handlers ---------- */

  function openDeliveryDetail(ref: string) {
    setDetailRef(ref)
    switchDeliveryView('detail')
  }

  function quickPickOrder(ref: string) {
    showToast('Picking Verified', `${ref} has been flagged as Picked and transitioned to Ready.`)
    patchRow(ref, { status: 'Ready', actions: { kind: 'picked', validate: pickedValidateTarget(ref) } })
  }

  function editDraftDelivery(ref: string) {
    switchDeliveryView('new')
    showToast('Draft Loaded', `Loaded ${ref} into outbound drafting view.`)
  }

  function discardDeliveryDraft(ref: string) {
    if (!window.confirm(`Void and discard draft ${ref}? Unallocated order lines will be deleted.`)) return
    setTable(({ rows }) => ({ rows: rows.filter((r) => r.ref !== ref), staleRows: {} }))
    showToast('Draft Discarded', `${ref} removed from queue.`)
  }

  function cancelDeliveryOrder(ref: string) {
    if (!window.confirm(`Cancel delivery order ${ref}? Stock reservations will immediately release.`)) return
    showToast('Order Canceled', `${ref} has been voided. Zero stock movement recorded.`)
    switchDeliveryView('list')
  }

  function printPickList(ref: string) {
    showToast('Printing Pick List', `Generating barcode-equipped manifesto for ${ref}.`)
  }

  function viewLedgerEntry(ledgerId: string) {
    showToast(`Ledger #${ledgerId}`, 'Viewing cryptographically signed ledger balance sheet.')
  }

  function viewAuditLog(ref: string) {
    showToast(`Audit Log: ${ref}`, 'Opening full immutable transaction timestamp ledger.')
  }

  /* ---------- Create view ---------- */

  function saveDeliveryOrderDraft() {
    showToast('Order Submitted', 'WH/OUT/00185 queued for Picking verification.')
    switchDeliveryView('list')
  }

  function saveDeliveryAsDraftOnly() {
    showToast('Draft Saved', 'WH/OUT/00185 saved as Draft with zero stock decrement.')
    switchDeliveryView('list')
  }

  function exportDeliveriesCSV() {
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(DELIVERIES_CSV))
    link.setAttribute('download', 'StockSense_Delivery_Orders.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('CSV Downloaded', 'Exported 6 outbound records to StockSense_Delivery_Orders.csv.')
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
              <span className="text-indigo-600 font-semibold">Deliveries</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500 font-mono lowercase text-xs" id="breadcrumbSubView">{breadcrumb}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Delivery Orders</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Outbound Shipments</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">38 Active</span>
            </div>
            <p className="text-sm text-slate-500 max-w-2xl">Track outgoing customer shipments, warehouse pick-pack verification, and atomic stock ledger postings.</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all" onClick={exportDeliveriesCSV}>
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export CSV</span>
            </button>
            <button className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all" onClick={() => switchDeliveryView('new')}>
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>+ New Delivery</span>
            </button>
          </div>
        </div>

        {/* VIEW 1: DELIVERY ORDERS DIRECTORY (/deliveries) */}
        <div className={view === 'list' ? 'flex flex-col space-y-6 pt-6' : 'flex flex-col space-y-6 pt-6 hidden'} id="viewDeliveryList">
          {/* 5 KPI Summary Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {KPI_CARDS.map((card) => (
              <div className={card.status === pinnedStatus ? KPI_CARD_ACTIVE : KPI_CARD_INACTIVE} data-status-card={card.status} key={card.status} onClick={() => filterByDeliveryStatus(card.status)}>
                <div className="flex items-center justify-between pb-1">
                  <span className={card.labelClass}>{card.status}</span>
                  <div className={card.iconClass}>
                    <span className="material-symbols-outlined text-[17px]">{card.icon}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={card.countClass}>{card.count}</span>
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
              <div className="md:col-span-4 relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                <input
                  className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50/70 border border-slate-200/90 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-body-sm"
                  id="deliverySearchInput"
                  onChange={(e) => {
                    setSearch(e.target.value)
                    handleDeliveryFilters()
                  }}
                  placeholder="Search by reference, customer, or SKU... (⌘F)"
                  type="text"
                  value={search}
                />
                <kbd className="absolute right-2.5 top-2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">⌘F</kbd>
              </div>
              {/* Filter Dropdown: Status */}
              <div className="md:col-span-2">
                <select
                  className="w-full py-2 px-3 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-700 font-label-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  id="filterDeliveryStatus"
                  onChange={(e) => {
                    setStatusFilter(e.target.value as StatusFilter)
                    handleDeliveryFilters()
                  }}
                  value={statusFilter}
                >
                  {renderOptions(STATUS_OPTIONS)}
                </select>
              </div>
              {/* Filter Dropdown: Warehouse */}
              <div className="md:col-span-2">
                <select
                  className="w-full py-2 px-3 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-700 font-label-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  id="filterDeliveryWarehouse"
                  onChange={(e) => {
                    setWarehouseFilter(e.target.value)
                    handleDeliveryFilters()
                  }}
                  value={warehouseFilter}
                >
                  {renderOptions(WAREHOUSE_OPTIONS)}
                </select>
              </div>
              {/* Filter Dropdown: Source Location */}
              <div className="md:col-span-2">
                <select
                  className="w-full py-2 px-3 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-700 font-label-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  id="filterDeliveryLocation"
                  onChange={(e) => {
                    setLocationFilter(e.target.value)
                    handleDeliveryFilters()
                  }}
                  value={locationFilter}
                >
                  {renderOptions(LOCATION_OPTIONS)}
                </select>
              </div>
              {/* Date Range & Reset */}
              <div className="md:col-span-2 flex items-center gap-2">
                <select
                  className="flex-1 py-2 px-2.5 text-xs bg-white border border-slate-200/90 rounded-xl text-slate-700 font-label-md focus:outline-none focus:border-indigo-500"
                  id="filterDeliveryDate"
                  onChange={(e) => {
                    setDateFilter(e.target.value)
                    handleDeliveryFilters()
                  }}
                  value={dateFilter}
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
                {pinnedStatus && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/80 border border-indigo-200 text-indigo-800 text-[11px] font-semibold" id="chipStatusDynamic">
                    <span id="chipStatusText">{`Status: ${pinnedStatus}`}</span>
                    <button className="hover:text-indigo-950 font-bold" onClick={clearStatusChip}>
                      ×
                    </button>
                  </span>
                )}
                <span className="text-slate-400 text-[11px]" id="chipCountIndicator">{`Showing ${visibleCount} of 38 records`}</span>
              </div>
              <button className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs inline-flex items-center gap-1" onClick={() => switchDeliveryView('new')}>
                <span className="material-symbols-outlined text-[15px]">add_box</span>
                <span>Draft New Outbound</span>
              </button>
            </div>
          </div>

          {/* DELIVERIES DATA TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:px-6 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100/90 text-indigo-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Outgoing Shipments &amp; Delivery Records</h3>
                  <p className="text-xs text-slate-500">Cryptographically verifiable atomic stock ledger records</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Immutable Chain Verified</span>
                </span>
              </div>
            </div>
            <div className="overflow-x-auto custom-scroll">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-label-sm uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4 font-semibold">Reference</th>
                    <th className="py-3 px-4 font-semibold">Customer / Destination</th>
                    <th className="py-3 px-4 font-semibold">Warehouse &amp; Source</th>
                    <th className="py-3 px-3 font-semibold text-center">Lines</th>
                    <th className="py-3 px-4 font-semibold text-right">Quantity</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold">Scheduled Date</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-body-sm" id="deliveriesTableBody">
                  {table.rows.map((delivery) => (
                    <DeliveryRow
                      delivery={delivery}
                      hidden={!isVisible(delivery)}
                      key={delivery.ref}
                      onDiscardDraft={discardDeliveryDraft}
                      onEditDraft={editDraftDelivery}
                      onOpenDetail={openDeliveryDetail}
                      onQuickPick={quickPickOrder}
                      onValidate={openValidateModal}
                      onViewAuditLog={viewAuditLog}
                      onViewLedger={viewLedgerEntry}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination Bar */}
            <div className="p-3.5 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>All validated deliveries generate immutable cryptographic entries in the Stock Ledger. Stock changes are atomic.</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[11px] text-slate-400 mr-2">
                  Showing <strong>1–7</strong> of <strong>38</strong>
                </span>
                <button className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-400 cursor-not-allowed font-medium text-[11px]" disabled>
                  Previous
                </button>
                <button className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold text-[11px]">1</button>
                <button className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-medium text-[11px]" onClick={() => showToast('Pagination', 'Navigating to page 2 of deliveries.')}>
                  2
                </button>
                <button className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-medium text-[11px]" onClick={() => showToast('Pagination', 'Navigating to page 3 of deliveries.')}>
                  3
                </button>
                <span className="px-1 text-slate-400">...</span>
                <button className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-medium text-[11px]" onClick={() => showToast('Pagination', 'Navigating to next page.')}>
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <NewDeliveryView active={view === 'new'} onDiscard={() => switchDeliveryView('list')} onSaveAsDraft={saveDeliveryAsDraftOnly} onSubmitForPicking={saveDeliveryOrderDraft} />

        <DeliveryDetailView
          active={view === 'detail'}
          ledgerPosted={ledgerPosted}
          onCancelOrder={cancelDeliveryOrder}
          onPrintPickList={printPickList}
          onValidate={() => openValidateModal(DETAIL_VALIDATE_TARGET)}
          onViewLedger={viewLedgerEntry}
          orderRef={detailRef}
        />

        {/* INTERACTIVE MODAL: VALIDATE DELIVERY ORDER (Atomic Ledger Deduction) */}
        {validateTarget && <DeliveryValidateModal isPosting={isPosting} onClose={closeDeliveryValidateModal} onConfirm={confirmDeliveryValidation} target={validateTarget} />}
      </div>
    </main>
  )
}
