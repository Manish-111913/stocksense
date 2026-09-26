import { type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { getProductSummary } from '../../api/products.ts'
import type { ProductSummary } from '../../api/types.ts'
import { useUserBadge } from '../../auth/useAuth.ts'
import { ROUTES } from '../../routes.ts'
import { NAV_TABS } from './data.ts'

const TAB = 'px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors'

type WarehouseHeaderProps = {
  /** Only passed for inventory managers */
  onAddWarehouse?: () => void
}

// macOS window chrome header with the pinned sub-navigation tab bar
export function WarehouseHeader({ onAddWarehouse }: WarehouseHeaderProps) {
  const { name, initial, roleLabel } = useUserBadge()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<ProductSummary | null>(null)
  const [headerSearch, setHeaderSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Live stock alert count for the bell dot
  useEffect(() => {
    let cancelled = false
    getProductSummary()
      .then((next) => !cancelled && setSummary(next))
      .catch(() => !cancelled && setSummary(null))
    return () => {
      cancelled = true
    }
  }, [])

  // ⌘K / Ctrl+K focuses the header search
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, to: string) {
    event.preventDefault()
    navigate(to)
  }

  // User badge opens the profile page (mouse, Enter or Space)
  function handleBadgeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      navigate(ROUTES.profile)
    }
  }

  // Header search: Enter opens the products list filtered by the term (name / SKU)
  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      const term = headerSearch.trim()
      navigate(term ? `${ROUTES.products}?search=${encodeURIComponent(term)}` : ROUTES.products)
    } else if (event.key === 'Escape') {
      setHeaderSearch('')
      event.currentTarget.blur()
    }
  }

  // Bell dot only when there are real stock alerts (low or out of stock)
  const stockAlerts = summary ? summary.lowStock + summary.outOfStock : 0

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
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Warehouse Management &amp; Locations</span>
          </div>
        </div>
        {/* Global Search Bar */}
        <div className="flex-1 max-w-lg mx-2 hidden md:block">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-[17px] text-slate-400">search</span>
            <input className="w-full pl-9 pr-14 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" onChange={(e) => setHeaderSearch(e.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Search products by name or SKU..." ref={searchInputRef} type="text" value={headerSearch} />
            <kbd className="absolute right-2 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">⌘K</kbd>
          </div>
        </div>
        {/* Right User Actions */}
        <div className="flex items-center gap-3">
          <button aria-label="Notifications" className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => navigate(ROUTES.dashboard)} title={stockAlerts > 0 ? `${stockAlerts} stock ${stockAlerts === 1 ? 'alert' : 'alerts'} (low / out of stock)` : 'No stock alerts'} type="button">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {stockAlerts > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />}
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2 pl-1 cursor-pointer rounded-lg hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" onClick={() => navigate(ROUTES.profile)} onKeyDown={handleBadgeKeyDown} role="button" tabIndex={0} title="Profile">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">{name}</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{roleLabel}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold flex items-center justify-center text-xs shadow-sm">
              {initial}
            </div>
          </div>
        </div>
      </div>
      {/* Pinned Sub-Navigation Tab Bar */}
      <div className="px-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between overflow-x-auto gap-4 py-1.5">
        <nav className="flex items-center gap-1 shrink-0">
          {NAV_TABS.map((tab) => (
            <a className={TAB} href="#" key={tab.label} onClick={(e) => handleNavClick(e, tab.to)}>
              {tab.label}
            </a>
          ))}
          {/* Actively Selected Warehouse Tab */}
          <a className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-sm transition-all flex items-center gap-1.5" href="#" onClick={(e) => handleNavClick(e, ROUTES.warehouse)}>
            <span className="material-symbols-outlined text-[14px]">warehouse</span>
            Warehouse
          </a>
        </nav>
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-2xs">{ROUTES.warehouse}</span>
          {onAddWarehouse && (
            <button className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5" onClick={onAddWarehouse} type="button">
              <span className="material-symbols-outlined text-[14px]">add</span>
              Add Warehouse
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
