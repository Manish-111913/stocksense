import { useState } from 'react'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { usePageChrome } from '../../hooks/usePageChrome.ts'
import { WAREHOUSES, warehouseSearchText } from './data.ts'
import { InspectorDrawer } from './InspectorDrawer.tsx'
import { WarehouseDock } from './WarehouseDock.tsx'
import { WarehouseHeader } from './WarehouseHeader.tsx'

const ROW_PRIMARY = 'hover:bg-indigo-50/40 bg-indigo-50/20 transition-colors cursor-pointer group'
const ROW = 'hover:bg-slate-50/80 transition-colors cursor-pointer group'
const INSPECT_PRIMARY = 'px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-2xs'
const INSPECT = 'px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors'
const FILTER_BTN = 'px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5'
const FILTER_PILL = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200 text-[11px]'
const BANNER_BTN = 'px-2.5 py-1 rounded-md text-[11px] font-medium bg-white text-slate-700 border border-indigo-200 hover:bg-indigo-50 shadow-2xs transition-colors'
const LOCATION_TAG = 'px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-700'
const PAGER_ARROW = 'p-1 rounded bg-white border border-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-40'

export default function WarehousePage() {
  useDocumentTitle('StockSense — Warehouse Management & Locations v2.4')
  usePageChrome('bg-slate-100/80 text-slate-900 p-2 sm:p-4 min-h-screen flex flex-col justify-between selection:bg-indigo-500 selection:text-white', 'ss-ledger')

  const [search, setSearch] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(true)

  const query = search.toLowerCase()

  function openDrawer() {
    setIsDrawerOpen(true)
  }

  function closeDrawer() {
    setIsDrawerOpen(false)
  }

  // Desktop App Window Shell Container
  return (
    <div className="w-full max-w-[1720px] mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/90 flex flex-col flex-1 overflow-hidden relative">
      <WarehouseHeader />
      {/* Main Scrollable Body Content */}
      <main className="flex-1 p-5 md:p-6 bg-slate-50/50 overflow-y-auto pb-28">
        {/* Breadcrumbs & Operations Sub-Header */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
            <span className="hover:text-slate-800 cursor-pointer">Operations</span>
            <span className="text-slate-400">/</span>
            <span className="hover:text-slate-800 cursor-pointer">Warehouses</span>
            <span className="text-slate-400">/</span>
            <span className="font-mono text-indigo-600 font-semibold">/warehouses</span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-display font-extrabold text-slate-900 tracking-tight">Warehouses &amp; Locations</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Multi-Node Mesh Active
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono text-xs font-semibold">
                  3 Facilities · 14 Locations
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Manage physical warehouse infrastructure, internal staging zones, storage racks, and operational bin locations.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
              <button className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all flex items-center gap-1.5" type="button">
                <span className="material-symbols-outlined text-[16px] text-slate-500">map</span>
                Export Network Map
              </button>
              <button className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5" type="button">
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Warehouse
              </button>
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
              <strong className="font-semibold text-indigo-900">Screen Mode Preview:</strong> Multi-warehouse topology and bin-level location infrastructure across active supply chain hubs
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200">
              Audit Mode Active
            </span>
            <button className={BANNER_BTN}>
              All Facilities
            </button>
            <button className={BANNER_BTN}>
              Export Network Pack
            </button>
            <button className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-colors flex items-center gap-1" onClick={openDrawer}>
              <span className="material-symbols-outlined text-[13px]">visibility</span>
              Inspect #WH-001 (Main Warehouse)
            </button>
          </div>
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
              <div className="text-2xl font-mono font-bold text-slate-900 tracking-tight">3</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Active enterprise distribution hubs
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
              <div className="text-2xl font-mono font-bold text-emerald-600 tracking-tight">14</div>
              <div className="text-xs text-slate-500 mt-1">Across all connected nodes</div>
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
              <div className="text-2xl font-mono font-bold text-slate-900 tracking-tight">148 <span className="text-xs font-sans font-normal text-slate-500">SKUs</span></div>
              <div className="text-xs text-slate-500 mt-1">Synchronized inventory items</div>
            </div>
          </div>
          {/* KPI 4: Highlighted Primary Hub Card with Indigo Accent Border */}
          <div className="bg-gradient-to-b from-indigo-50/50 to-white rounded-xl p-4 border-2 border-indigo-500 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Primary Hub</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                Central
              </span>
            </div>
            <div>
              <div className="text-base font-display font-bold text-indigo-600 truncate">Main Warehouse (West)</div>
              <div className="text-xs text-indigo-900/70 font-medium mt-1">7 internal storage bays</div>
            </div>
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
              <div className="text-2xl font-mono font-bold text-emerald-600 tracking-tight">100%</div>
              <div className="text-xs text-slate-500 mt-1">All nodes operational</div>
            </div>
          </div>
        </div>
        {/* Filter & Search Controls Bar */}
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs mb-5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Main Search Input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
              <input className="w-full pl-9 pr-14 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" id="warehouseSearchInput" onChange={(e) => setSearch(e.target.value)} placeholder="Search warehouses by name, code, city, or manager..." type="text" value={search} />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">⌘F</kbd>
            </div>
            {/* Dropdown Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <button className={FILTER_BTN} type="button">
                <span>Facility Status: <strong className="font-semibold text-slate-900">All (3)</strong></span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
              </button>
              <button className={FILTER_BTN} type="button">
                <span>Warehouse Type: All Types</span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
              </button>
              <button className={FILTER_BTN} type="button">
                <span>Region: All Regions</span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
              </button>
              <button className={FILTER_BTN} type="button">
                <span className="material-symbols-outlined text-[15px] text-slate-400">calendar_today</span>
                <span>Last 30 Days</span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors" onClick={() => setSearch('')} title="Reset Filters" type="button">
                <span className="material-symbols-outlined text-[17px]">restart_alt</span>
              </button>
            </div>
          </div>
          {/* Active Filter Pills & Results Count */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className={FILTER_PILL}>
                Status: All
                <span className="material-symbols-outlined text-[13px] text-slate-400 hover:text-slate-600 cursor-pointer">close</span>
              </span>
              <span className={FILTER_PILL}>
                Region: All Hubs
                <span className="material-symbols-outlined text-[13px] text-slate-400 hover:text-slate-600 cursor-pointer">close</span>
              </span>
              <span className={FILTER_PILL}>
                Topology: Mesh Active
                <span className="material-symbols-outlined text-[13px] text-slate-400 hover:text-slate-600 cursor-pointer">close</span>
              </span>
            </div>
            <div className="text-slate-500 font-mono text-[11px]">
              Showing <strong className="text-slate-900 font-semibold font-sans">3</strong> of 3 enterprise warehouses
            </div>
          </div>
        </div>
        {/* Main Workspace Split: Table + Inspection Drawer */}
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  TOPOLOGY VERIFIED
                </span>
                <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500 pl-2 border-l border-slate-200">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-600" /> Active Facility</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Staging Bays</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Cold Storage</span>
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
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {WAREHOUSES.map((row) => (
                    // Hidden rows stay in the DOM (display: none) like the original, so divide-y borders match
                    <tr className={row.primary ? ROW_PRIMARY : ROW} key={row.code} onClick={openDrawer} style={warehouseSearchText(row).includes(query) ? undefined : { display: 'none' }}>
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          <div className={row.iconBoxClassName}>
                            <span className="material-symbols-outlined text-[18px]">{row.icon}</span>
                          </div>
                          <div>
                            {row.primary ? (
                              <div className="font-semibold text-indigo-700 flex items-center gap-1.5">
                                {row.name}
                                <span className="material-symbols-outlined text-[14px] text-amber-500">star</span>
                              </div>
                            ) : (
                              <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {row.name}
                              </div>
                            )}
                            <div className="font-mono text-[11px] text-slate-500">{row.code}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{row.address}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 mb-1">{row.locationsLabel}</div>
                        <div className="flex flex-wrap gap-1">
                          {row.locationTags.map((tag) => (
                            <span className={LOCATION_TAG} key={tag}>{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 text-xs">{row.skus}</div>
                        <div className="text-[11px] text-slate-500 max-w-[150px] truncate">{row.skuSummary}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            className={row.primary ? INSPECT_PRIMARY : INSPECT}
                            onClick={(e) => {
                              openDrawer()
                              e.stopPropagation()
                            }}
                            type="button"
                          >
                            Inspect
                          </button>
                          <button className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Edit Facility" type="button">
                            <span className="material-symbols-outlined text-[17px]">edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Table Footer & Security Statement */}
            <div className="p-3.5 px-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="material-symbols-outlined text-[17px] text-indigo-600">security</span>
                <span>All warehouse locations enforce strict single-parent warehouse containment and immutable movement ledger bindings.</span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-slate-500 font-mono text-[11px]">Showing 1-3 of 3 warehouses</span>
                <div className="flex items-center gap-1">
                  <button className={PAGER_ARROW} disabled>
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <button className="w-6 h-6 rounded bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center shadow-2xs">1</button>
                  <button className={PAGER_ARROW} disabled>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <InspectorDrawer isOpen={isDrawerOpen} onClose={closeDrawer} />
        </div>
      </main>
      <WarehouseDock />
      {/* Bottom System Telemetry Status Bar */}
      <footer className="h-7 bg-slate-100 border-t border-slate-200 px-4 flex items-center justify-between text-[11px] font-mono text-slate-500 z-30 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="hidden sm:inline">Synced: Bengaluru Central Hub · Active SKUs: 148 · Latency: 24ms · Operational Core · Automated Reorder: Active</span>
          <span className="sm:hidden">Synced: Bengaluru Central · Latency: 24ms</span>
        </div>
        <div className="flex items-center gap-3">
          <span>SSL 256-bit</span>
          <span>Node v18.19</span>
        </div>
      </footer>
    </div>
  )
}
