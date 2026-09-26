import { type MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { ROUTES } from '../../routes.ts'
import { NAV_TABS } from './data.ts'

const TAB = 'px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors'
const TAB_WITH_BADGE = `${TAB} flex items-center gap-1.5`

// macOS window chrome header with the pinned sub-navigation tab bar
export function WarehouseHeader() {
  const navigate = useNavigate()

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, to?: string) {
    event.preventDefault()
    if (to) navigate(to)
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="h-14 px-5 flex items-center justify-between gap-4">
        {/* Traffic lights & Title */}
        <div className="flex items-center gap-4 min-w-[280px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-sm" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-[15px]">warehouse</span>
            </div>
            <span className="font-display font-bold text-slate-900 text-sm tracking-tight">StockSense</span>
            <span className="text-slate-300">—</span>
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Warehouse Management &amp; Locations v2.4</span>
          </div>
        </div>
        {/* Global Search Bar */}
        <div className="flex-1 max-w-lg mx-2 hidden md:block">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-[17px] text-slate-400">search</span>
            <input className="w-full pl-9 pr-14 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="Search catalog, SKUs, or transfer batch..." type="text" />
            <kbd className="absolute right-2 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">⌘K</kbd>
          </div>
        </div>
        {/* Right User Actions */}
        <div className="flex items-center gap-3">
          <button aria-label="Notifications" className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors" type="button">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2 pl-1">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">Manish</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Inventory Admin</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold flex items-center justify-center text-xs shadow-sm" onClick={() => navigate(ROUTES.profile)}>
              M
            </div>
          </div>
        </div>
      </div>
      {/* Pinned Sub-Navigation Tab Bar */}
      <div className="px-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between overflow-x-auto gap-4 py-1.5">
        <nav className="flex items-center gap-1 shrink-0">
          {NAV_TABS.map((tab) => (
            <a className={tab.badge ? TAB_WITH_BADGE : TAB} href="#" key={tab.label} onClick={(e) => handleNavClick(e, tab.to)}>
              {tab.label}
              {tab.badge && <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">{tab.badge}</span>}
            </a>
          ))}
          {/* Actively Selected Warehouse Tab */}
          <a className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-sm transition-all flex items-center gap-1.5" href="#" onClick={(e) => handleNavClick(e, ROUTES.warehouse)}>
            <span className="material-symbols-outlined text-[14px]">warehouse</span>
            Warehouse
          </a>
          <a className={TAB} href="#" onClick={(e) => handleNavClick(e)}>Directory</a>
        </nav>
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">/warehouses</span>
          <button className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5" type="button">
            <span className="material-symbols-outlined text-[14px]">add</span>
            Add Warehouse
          </button>
        </div>
      </div>
    </header>
  )
}
