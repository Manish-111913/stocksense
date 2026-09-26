import { useState } from 'react'
import { usePillAction } from '../../context/pillActions.ts'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { DetailPanel } from './components/DetailPanel.tsx'
import { FilterSelect } from './components/FilterSelect.tsx'
import { KpiCard } from './components/KpiCard.tsx'
import { NewTransferModal } from './components/NewTransferModal.tsx'
import { TransferRow } from './components/TransferRow.tsx'
import { ValidateModal } from './components/ValidateModal.tsx'
import {
  DATE_OPTIONS,
  KPI_CARDS,
  LOCATION_OPTIONS,
  STATUS_OPTIONS,
  TRANSFER_00142_VALIDATION,
  TRANSFERS,
  WAREHOUSE_OPTIONS,
  type StatusFilter,
  type ValidateTarget,
} from './data.ts'

export default function TransfersPage() {
  useDocumentTitle('StockSense — Internal Transfers v2.4')
  const { showToast } = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Ready')
  const [isNewTransferOpen, setIsNewTransferOpen] = useState(false)
  const [isValidateOpen, setIsValidateOpen] = useState(false)
  const [validateTarget, setValidateTarget] = useState<ValidateTarget>(TRANSFER_00142_VALIDATION)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [panelRef, setPanelRef] = useState('WH/INT/00142')

  function openNewTransferModal() {
    setIsNewTransferOpen(true)
  }

  function openValidateModal(target: ValidateTarget) {
    setValidateTarget(target)
    setIsValidateOpen(true)
  }

  function closeValidateModal() {
    setIsValidateOpen(false)
  }

  function executeAtomicValidation() {
    closeValidateModal()
    showToast('Transfer Validated', `Transfer ${validateTarget.ref} atomically committed and posted to ledger.`)
  }

  function openDetailPanel(ref: string) {
    setPanelRef(ref)
    setIsDetailOpen(true)
  }

  function closeDetailPanel() {
    setIsDetailOpen(false)
  }

  // Only syncs the status select, like the original (rows and KPI highlight stay as they are)
  function filterByStatus(status: StatusFilter) {
    setStatusFilter(status)
    showToast(`Filter applied: ${status}`, 'Filtered internal transfer records.')
  }

  function resetFilters() {
    setSearch('')
    setStatusFilter('ALL')
    showToast('Filters Reset', 'Displaying all 24 internal movement records.')
  }

  function exportTransfersCSV() {
    showToast('Export Initiated', 'Downloaded StockSense_Internal_Transfers.csv')
  }

  usePillAction('new-transfer', openNewTransferModal)
  usePillAction('transfer-detail', () => openDetailPanel('WH/INT/00142'))

  return (
    <>
      {/* MAIN INTERIOR CONTENT */}
      <main className="w-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-8 transition-all duration-150">
        {/* Interactive State Preview Ribbon */}
        <div className="bg-indigo-50/60 border border-indigo-100/90 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-950">
            <span className="material-symbols-outlined text-indigo-600 text-[18px]">tune</span>
            <span>Screen Mode Preview:</span>
            <span className="text-[11px] font-normal text-indigo-700 hidden sm:inline">Atomic bin-to-bin movements across interconnected hubs</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] bg-white p-0.5 rounded-lg border border-indigo-200/70 shadow-xs">
            <button className="px-2.5 py-1 rounded-md font-semibold bg-indigo-600 text-white shadow-xs flex items-center gap-1 transition-all" onClick={() => filterByStatus('Ready')}>
              <span className="material-symbols-outlined text-[13px]">visibility</span> Ready to Validate
            </button>
            <button className="px-2.5 py-1 rounded-md font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1" onClick={() => filterByStatus('ALL')}>
              <span className="material-symbols-outlined text-[13px]">list</span> All Records
            </button>
            <button className="px-2.5 py-1 rounded-md font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1" onClick={openNewTransferModal}>
              <span className="material-symbols-outlined text-[13px]">add</span> Draft Transfer
            </button>
            <div className="h-3.5 w-[1px] bg-indigo-200/80 mx-1" />
            <button className="px-2.5 py-1 rounded-md font-medium text-indigo-700 hover:bg-indigo-50 transition-all flex items-center gap-1" onClick={() => openDetailPanel('WH/INT/00142')}>
              <span className="material-symbols-outlined text-[13px]">receipt_long</span> Inspect #00142
            </button>
          </div>
        </div>
        {/* Breadcrumbs & Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[15px]">sync_alt</span>
                <span>Operations</span>
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800">Transfers</span>
              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-indigo-50 text-indigo-700 font-medium ml-1">/transfers</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Internal Transfers</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Inter-Hub Movement
              </span>
              <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">24 Active</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Move inventory between warehouse nodes, production cells, and bins without altering total company stock.</p>
          </div>
          {/* Header Actions */}
          <div className="flex items-center gap-2.5">
            <button className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all" onClick={exportTransfersCSV}>
              <span className="material-symbols-outlined text-[16px] text-slate-500">download</span>
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
            <KpiCard card={card} key={card.status} onSelect={filterByStatus} />
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reference, SKU, or location..."
                type="text"
                value={search}
              />
              <kbd className="absolute right-2.5 top-1.5 px-1.5 py-0.2 text-[10px] font-medium font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">⌘F</kbd>
            </div>
            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect id="statusFilterSelect" onChange={(value) => setStatusFilter(value as StatusFilter)} options={STATUS_OPTIONS} value={statusFilter} />
              <FilterSelect options={WAREHOUSE_OPTIONS} />
              <FilterSelect options={LOCATION_OPTIONS} />
              <FilterSelect options={DATE_OPTIONS} />
              <button className="text-xs font-medium text-slate-500 hover:text-indigo-600 px-2 py-1.5 flex items-center gap-1 transition-colors" onClick={resetFilters}>
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                <span>Reset</span>
              </button>
            </div>
          </div>
          {/* Active Filter Tags & Count Summary */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 text-[11px]">Active filters:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                Scope: Internal Movements
                <span className="material-symbols-outlined text-[13px] cursor-pointer hover:text-indigo-600">close</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-200/80">
                Status: Ready
                <span className="material-symbols-outlined text-[13px] cursor-pointer hover:text-indigo-900">close</span>
              </span>
            </div>
            <span className="text-slate-500 font-mono text-[11px]">Showing 3 of 24 records</span>
          </div>
        </div>
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
                    Immutable Chain Verified
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Cryptographically verifiable atomic stock ledger entries reflecting bin-to-bin and hub-to-hub movements.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-500 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                Source: Allocated
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Dest: Staged
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
                  <th className="py-3 px-5">Scheduled Date</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {TRANSFERS.map((transfer) => (
                  <TransferRow key={transfer.ref} onOpenDetail={openDetailPanel} onValidate={openValidateModal} transfer={transfer} />
                ))}
              </tbody>
            </table>
          </div>
          {/* Table Footer Note and Strict Pagination */}
          <div className="p-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[15px] text-indigo-600">verified_user</span>
              <span>All validated transfers generate immutable cryptographic entries in the Stock Ledger. Total company stock remains unchanged; only location balances shift.</span>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span>Showing 1-3 of 24 transfers</span>
              <div className="flex items-center gap-1">
                <button className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors shadow-2xs disabled:opacity-40" disabled type="button">
                  <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                </button>
                <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-semibold text-[10px]">1</span>
                <span className="text-slate-400">/</span>
                <span className="px-2 py-0.5 text-slate-600 text-[10px]">8</span>
                <button className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors shadow-2xs" type="button">
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* SLIDE-OVER DRAWER: Transfer Detail View Panel */}
      <DetailPanel
        onClose={closeDetailPanel}
        onValidate={() => {
          closeDetailPanel()
          openValidateModal(TRANSFER_00142_VALIDATION)
        }}
        open={isDetailOpen}
        transferRef={panelRef}
      />

      {/* MODAL 1: Create New Internal Transfer Modal */}
      <NewTransferModal onClose={() => setIsNewTransferOpen(false)} open={isNewTransferOpen} />

      {/* MODAL 2: Atomic Validation Confirmation Dialog */}
      <ValidateModal onClose={closeValidateModal} onConfirm={executeAtomicValidation} open={isValidateOpen} target={validateTarget} />
    </>
  )
}
