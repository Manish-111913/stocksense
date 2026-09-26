import { useState } from 'react'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { usePageChrome } from '../../hooks/usePageChrome.ts'
import { FILTER_PILLS, LEDGER_ROWS } from './data.ts'
import { InspectorDrawer } from './InspectorDrawer.tsx'
import { KpiCards } from './KpiCards.tsx'
import { LedgerDock } from './LedgerDock.tsx'
import { LedgerFooter } from './LedgerFooter.tsx'
import { LedgerHeader } from './LedgerHeader.tsx'
import { LedgerRow } from './LedgerRow.tsx'

export default function MoveHistoryPage() {
  useDocumentTitle('StockSense — Stock Ledger & Move History v2.4')
  usePageChrome('bg-slate-100/80 text-slate-900 p-2 sm:p-4 min-h-screen flex flex-col justify-between selection:bg-indigo-500 selection:text-white', 'ss-ledger')

  const [isDrawerOpen, setIsDrawerOpen] = useState(true)

  const openDrawer = () => setIsDrawerOpen(true)
  const closeDrawer = () => setIsDrawerOpen(false)

  return (
    // Desktop App Window Shell Container
    <div className="w-full max-w-[1720px] mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/90 flex flex-col flex-1 overflow-hidden relative">
      <LedgerHeader />
      {/* Main Scrollable Body Content */}
      <main className="flex-1 p-5 md:p-6 bg-slate-50/50 overflow-y-auto pb-28">
        {/* Breadcrumbs & Operations Sub-Header */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
            <span className="hover:text-slate-800 cursor-pointer">Operations</span>
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
                  Immutable Chain Verified
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono text-xs font-semibold">
                  1,420 Movements
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Immutable chronological ledger recording inbound receipts, customer dispatches, internal inter-bay shifts, and physical count reconciliation logs.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
              <button className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all flex items-center gap-1.5" type="button">
                <span className="material-symbols-outlined text-[16px] text-slate-500">download</span>
                Export Audit Log
              </button>
              <button className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5" onClick={openDrawer} type="button">
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                Inspect Ledger
              </button>
            </div>
          </div>
        </div>
        {/* Screen Mode Preview Banner */}
        <div className="mb-5 p-3 px-4 rounded-xl bg-indigo-50/70 border border-indigo-100/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700">
            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <span className="material-symbols-outlined text-[15px]">verified_user</span>
            </span>
            <span>
              <strong className="font-semibold text-indigo-900">Screen Mode Preview:</strong> Cryptographically chained immutable stock ledger across Receipts, Deliveries, Transfers &amp; Adjustments
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
              Audit Mode Active
            </span>
            <button className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white text-slate-700 border border-indigo-200 hover:bg-indigo-50 shadow-2xs transition-colors">
              All Records
            </button>
            <button className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white text-slate-700 border border-indigo-200 hover:bg-indigo-50 shadow-2xs transition-colors">
              Export Audit Pack
            </button>
            <button className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-colors flex items-center gap-1" onClick={openDrawer}>
              <span className="material-symbols-outlined text-[13px]">visibility</span>
              Inspect #LG-2026-099214
            </button>
          </div>
        </div>
        <KpiCards />
        {/* Filter & Search Controls Bar */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs mb-5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Main Search Input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
              <input className="w-full pl-9 pr-14 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="Search stock movements, SKU, batch, ref, warehouse, or location..." type="text" />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">⌘F</kbd>
            </div>
            {/* Dropdown Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <button className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5" type="button">
                <span>Movement Type: <strong className="font-semibold text-slate-900">All (4)</strong></span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
              </button>
              <button className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5" type="button">
                <span>All Warehouses</span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
              </button>
              <button className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5" type="button">
                <span>All Locations &amp; Bins</span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
              </button>
              <button className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5" type="button">
                <span className="material-symbols-outlined text-[15px] text-slate-400">calendar_today</span>
                <span>Last 30 Days</span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors" title="Reset Filters" type="button">
                <span className="material-symbols-outlined text-[17px]">restart_alt</span>
              </button>
            </div>
          </div>
          {/* Active Filter Pills & Results Count */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {FILTER_PILLS.map((pill) => (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200 text-[11px]" key={pill}>
                  {pill}
                  <span className="material-symbols-outlined text-[13px] text-slate-400 hover:text-slate-600 cursor-pointer">close</span>
                </span>
              ))}
            </div>
            <div className="text-slate-500 font-mono text-[11px]">
              Showing <strong className="text-slate-900 font-semibold font-sans">5</strong> of 1,420 ledger records
            </div>
          </div>
        </div>
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
                  <p className="text-xs text-slate-500">Real-time ledger synchronized with transactional ERP events</p>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  IMMUTABLE CHAIN VERIFIED
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
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {LEDGER_ROWS.map((row) => (
                    <LedgerRow key={row.reference} onInspect={openDrawer} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
            {/* Table Footer & Immutable Statement */}
            <div className="p-3.5 px-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="material-symbols-outlined text-[17px] text-indigo-600">security</span>
                <span>All ledger entries are generated automatically by verified operations. Movements are permanent, cryptographically chained, and strictly read-only.</span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-slate-500 font-mono text-[11px]">Showing 1-5 of 1,420</span>
                <div className="flex items-center gap-1">
                  <button className="p-1 rounded bg-white border border-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-40" disabled>
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <button className="w-6 h-6 rounded bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center shadow-2xs">1</button>
                  <button className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs flex items-center justify-center">2</button>
                  <button className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs flex items-center justify-center">3</button>
                  <span className="text-slate-400 px-0.5 text-xs">...</span>
                  <button className="px-1.5 h-6 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs flex items-center justify-center">284</button>
                  <button className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900">
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <InspectorDrawer isOpen={isDrawerOpen} onClose={closeDrawer} />
        </div>
      </main>
      <LedgerDock />
      <LedgerFooter />
    </div>
  )
}
