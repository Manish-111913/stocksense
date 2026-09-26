import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { ROUTES } from '../../routes.ts'
import { FilterSelect } from './list/FilterSelect.tsx'
import { ReceiptRow } from './list/ReceiptRow.tsx'
import {
  DATE_OPTIONS,
  INITIAL_RECEIPTS,
  KPI_CARD_ACTIVE,
  KPI_CARD_INACTIVE,
  KPI_CARDS,
  matchesReceiptFilters,
  RECEIPTS_CSV,
  STATUS_OPTIONS,
  SUPPLIER_OPTIONS,
  WAREHOUSE_OPTIONS,
  type Receipt,
  type ReceiptStatus,
  type StatusFilter,
  type ValidateTarget,
} from './list/receiptsData.ts'
import { ValidateModal } from './list/ValidateModal.tsx'

export default function ReceiptsPage() {
  useDocumentTitle('StockSense — Receipts Management')
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [receipts, setReceipts] = useState<Receipt[]>(INITIAL_RECEIPTS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Ready')
  const [warehouseFilter, setWarehouseFilter] = useState('ALL')
  const [supplierFilter, setSupplierFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('30D')
  // Highlighted KPI card + "Status: X" chip: set only by the KPI cards, cleared by the chip and Reset
  const [pinnedStatus, setPinnedStatus] = useState<ReceiptStatus | null>('Ready')
  // The original doesn't re-run the filters after a validation, so a validated row stays visible
  // (and counted) until the next filter change
  const [keptVisibleRefs, setKeptVisibleRefs] = useState<string[]>([])
  const [validateTarget, setValidateTarget] = useState<ValidateTarget | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const postTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(postTimer.current), [])

  const filters = { search, status: statusFilter, warehouse: warehouseFilter, supplier: supplierFilter }
  const isVisible = (r: Receipt) => keptVisibleRefs.includes(r.ref) || matchesReceiptFilters(r, filters)
  const visibleCount = receipts.filter(isVisible).length

  // Any filter change re-evaluates every row
  function handleFilterChange() {
    setKeptVisibleRefs([])
  }

  // Status filter from the top KPI cards
  function filterByStatus(status: ReceiptStatus) {
    setStatusFilter(status)
    setPinnedStatus(status)
    handleFilterChange()
  }

  function clearSingleFilter() {
    setStatusFilter('ALL')
    setPinnedStatus(null)
    handleFilterChange()
  }

  function resetAllReceiptFilters() {
    setSearch('')
    setStatusFilter('ALL')
    setWarehouseFilter('ALL')
    setSupplierFilter('ALL')
    setDateFilter('30D')
    setPinnedStatus(null)
    handleFilterChange()
    showToast('Filters Reset', 'Showing all incoming inventory receipts.')
  }

  function openValidateModal(receipt: Receipt) {
    setValidateTarget({
      ref: receipt.ref,
      supplier: receipt.supplier,
      quantity: receipt.validation?.quantity ?? receipt.quantity,
      location: receipt.validation?.location ?? receipt.zone,
    })
  }

  function closeValidateModal() {
    setValidateTarget(null)
  }

  function confirmReceiptValidation() {
    if (!validateTarget) return
    const { ref } = validateTarget
    setIsPosting(true)

    postTimer.current = window.setTimeout(() => {
      setIsPosting(false)
      closeValidateModal()
      showToast('Receipt Validated', `${ref} successfully posted to Stock Ledger.`)
      setReceipts((rows) => rows.map((r) => (r.ref === ref ? { ...r, status: 'Done' } : r)))
      setKeptVisibleRefs((refs) => [...refs, ref])
    }, 600)
  }

  function openReceiptDetail(ref: string) {
    showToast(`Receipt ${ref}`, 'Opening detailed line item manifesto and cryptographic hash.')
  }

  function editDraft() {
    navigate(ROUTES.receiptNew)
  }

  function discardDraft(ref: string) {
    if (!window.confirm(`Are you sure you want to discard draft ${ref}? This will void unposted lines.`)) return
    showToast('Draft Discarded', `${ref} has been removed.`)
    setReceipts((rows) => rows.filter((r) => r.ref !== ref))
    handleFilterChange()
  }

  function exportReceiptsCSV() {
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(RECEIPTS_CSV))
    link.setAttribute('download', 'StockSense_Inbound_Receipts.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Export Finished', 'StockSense_Inbound_Receipts.csv downloaded.')
  }

  function openNewReceiptModal() {
    navigate(ROUTES.receiptNew)
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
                <span className="hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-[15px]">corporate_fare</span>
                  <span>Operations</span>
                </span>
                <span className="text-slate-300">/</span>
                <span className="font-semibold text-slate-800">Receipts</span>
                <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-indigo-50 text-indigo-700 font-medium ml-1">/receipts</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Receipts</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Inbound Goods
                </span>
                <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">38 Active</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Track incoming vendor shipments, staging berths, and atomic stock ledger postings.</p>
            </div>
            {/* Header Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all" onClick={exportReceiptsCSV}>
                <span className="material-symbols-outlined text-[16px] text-slate-500">download</span>
                <span>Export CSV</span>
              </button>
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98]" onClick={openNewReceiptModal}>
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>+ New Receipt</span>
              </button>
            </div>
          </div>

          {/* KPI SUMMARY CARDS (5 Lifecycle Stages) */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6" id="kpi-cards-grid">
            {KPI_CARDS.map((card) => (
              <div className={card.status === pinnedStatus ? KPI_CARD_ACTIVE : KPI_CARD_INACTIVE} data-status={card.status} key={card.status} onClick={() => filterByStatus(card.status)}>
                <div className={card.headClass}>
                  <span className={card.labelClass}>{card.status}</span>
                  <span className={card.iconClass}>
                    <span className="material-symbols-outlined text-[17px]">{card.icon}</span>
                  </span>
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className={card.countClass}>{card.count}</span>
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
                  onChange={(e) => {
                    setSearch(e.target.value)
                    handleFilterChange()
                  }}
                  placeholder="Search receipts by reference, supplier, product, or SKU... (⌘F)"
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
                  onChange={(value) => {
                    setStatusFilter(value as StatusFilter)
                    handleFilterChange()
                  }}
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  wrapperClass="relative min-w-[130px]"
                />
                <FilterSelect
                  icon="expand_more"
                  id="receiptFilterWarehouse"
                  onChange={(value) => {
                    setWarehouseFilter(value)
                    handleFilterChange()
                  }}
                  options={WAREHOUSE_OPTIONS}
                  value={warehouseFilter}
                  wrapperClass="relative min-w-[145px]"
                />
                <FilterSelect
                  icon="expand_more"
                  id="receiptFilterSupplier"
                  onChange={(value) => {
                    setSupplierFilter(value)
                    handleFilterChange()
                  }}
                  options={SUPPLIER_OPTIONS}
                  value={supplierFilter}
                  wrapperClass="relative min-w-[155px]"
                />
                <FilterSelect
                  icon="calendar_today"
                  id="receiptFilterDate"
                  onChange={(value) => {
                    setDateFilter(value)
                    handleFilterChange()
                  }}
                  options={DATE_OPTIONS}
                  value={dateFilter}
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
                {pinnedStatus && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-200/70" id="chip-dynamic">
                    <span id="chip-dynamic-label">Status: {pinnedStatus}</span>
                    <button className="hover:text-indigo-900 flex items-center" onClick={clearSingleFilter}>
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </span>
                )}
              </div>
              <span className="text-slate-500 font-mono text-[11px]" id="filterCountIndicator">Showing {visibleCount} of 38 records</span>
            </div>
          </div>

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
                  <p className="text-[11px] text-slate-400">Cryptographically verifiable atomic stock ledger records</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Immutable Chain Verified
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
                <tbody className="divide-y divide-slate-100 font-sans" id="receiptsTableBody">
                  {receipts.map((receipt) => (
                    <ReceiptRow
                      hidden={!isVisible(receipt)}
                      key={receipt.ref}
                      onDiscardDraft={discardDraft}
                      onEditDraft={editDraft}
                      onOpenDetail={openReceiptDetail}
                      onValidate={openValidateModal}
                      receipt={receipt}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination & Security Guarantee Footer */}
            <div className="p-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>All validated receipts generate immutable cryptographic entries in the Stock Ledger. Stock changes are atomic.</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-500">Showing 1–7 of 38 receipts</span>
                <div className="flex items-center gap-1">
                  <button className="p-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-40 transition-colors" disabled title="Previous Page">
                    <span className="material-symbols-outlined text-[15px]">chevron_left</span>
                  </button>
                  <span className="px-2 py-0.5 rounded font-mono font-semibold bg-white border border-slate-200 text-indigo-700 shadow-xs">1</span>
                  <span className="text-slate-400 font-mono">/ 6</span>
                  <button className="p-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors" onClick={() => showToast('Pagination', 'Navigating to page 2 of receipts...')} title="Next Page">
                    <span className="material-symbols-outlined text-[15px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* QUICK VALIDATE MODAL (Atomic Ledger Posting) */}
      {validateTarget && <ValidateModal isPosting={isPosting} onClose={closeValidateModal} onConfirm={confirmReceiptValidation} target={validateTarget} />}
    </>
  )
}
