import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { PillActionsContext, type PillActionRegistry } from '../context/pillActions.ts'
import { ToastContext } from '../context/toast.ts'
import { usePageChrome } from '../hooks/usePageChrome.ts'
import { getProductSummary } from '../api/products.ts'
import type { ProductSummary } from '../api/types.ts'
import { useUserBadge } from '../auth/useAuth.ts'
import { ROUTES } from '../routes.ts'

type ModuleKey = 'dashboard' | 'products' | 'receipts' | 'deliveries' | 'transfers' | 'adjustments' | 'moveHistory' | 'warehouse'

/**
 * The original screens come in two shell revisions:
 * - classic: Products / Receipts / Deliveries
 * - v2: Transfers / Adjustments ("(Active)" dock tooltips, other toast motion)
 */
type ShellVariant = 'classic' | 'v2'

interface ShellConfig {
  title: string
  module: ModuleKey
  variant: ShellVariant
  bodyPadding: string
  toastMotion: string
  toastMs: number
  titleIcon?: string
  searchPlaceholder?: string
}

const CLASSIC_TOAST = { toastMotion: 'animate-bounce duration-300', toastMs: 3800 }

function shellConfigFor(pathname: string): ShellConfig {
  switch (pathname) {
    case ROUTES.receipts:
      return { title: 'StockSense — Receipts Management', module: 'receipts', variant: 'classic', bodyPadding: 'pb-32', toastMotion: 'transition-all duration-300', toastMs: 3800 }
    case ROUTES.receiptNew:
      return { title: 'StockSense — Receipts Management', module: 'receipts', variant: 'classic', bodyPadding: 'pb-32', ...CLASSIC_TOAST }
    case ROUTES.deliveries:
      return { title: 'StockSense — Delivery Orders', module: 'deliveries', variant: 'classic', bodyPadding: 'pb-32', toastMotion: 'transition-all duration-300', toastMs: 3500 }
    case ROUTES.transfers:
      return { title: 'StockSense — Internal Transfers', module: 'transfers', variant: 'v2', titleIcon: 'swap_horiz', searchPlaceholder: 'Search catalog by product name or SKU...', bodyPadding: 'pb-32', toastMotion: 'transition-all duration-200', toastMs: 3500 }
    case ROUTES.adjustments:
      return { title: 'StockSense — Inventory Adjustments', module: 'adjustments', variant: 'v2', titleIcon: 'tune', searchPlaceholder: 'Search catalog by product name or SKU...', bodyPadding: 'pb-32', toastMotion: 'transition-all duration-200', toastMs: 3500 }
    case ROUTES.products:
    case ROUTES.productNew:
      return { title: 'StockSense — Products Management', module: 'products', variant: 'classic', bodyPadding: 'pb-32', ...CLASSIC_TOAST }
    default:
      if (pathname.startsWith('/receipts/')) {
        return { title: 'StockSense — Receipts Management', module: 'receipts', variant: 'classic', bodyPadding: 'pb-32', ...CLASSIC_TOAST }
      }
      return { title: 'StockSense — Products Management', module: 'products', variant: 'classic', bodyPadding: 'pb-32', ...CLASSIC_TOAST }
  }
}

interface ToastState {
  title: string
  subtitle: string
}

// Shared window frame for the module screens: title bar and toast (the module dock is global)
export default function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const shell = shellConfigFor(pathname)
  usePageChrome(`bg-slate-100/90 text-slate-800 antialiased font-sans min-h-screen pt-3 sm:pt-4 px-3 sm:px-4 flex flex-col items-center justify-start selection:bg-indigo-500 selection:text-white ${shell.bodyPadding}`, 'ss-app')
  const { name, initial, roleLabel } = useUserBadge()

  // Live catalog figures for the footer and the alerts bell (refreshed on every screen change)
  const [summary, setSummary] = useState<ProductSummary | null>(null)
  useEffect(() => {
    let cancelled = false
    getProductSummary()
      .then((next) => !cancelled && setSummary(next))
      .catch(() => !cancelled && setSummary(null))
    return () => {
      cancelled = true
    }
  }, [pathname])

  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const [pillActions] = useState<PillActionRegistry>(() => new Map())

  const { toastMs } = shell
  const showToast = useCallback(
    (title: string, subtitle: string) => {
      setToast({ title, subtitle })
      window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(() => setToast(null), toastMs)
    },
    [toastMs],
  )

  const toastContext = useMemo(() => ({ showToast }), [showToast])

  // Header user badge opens the profile page (mouse, Enter or Space)
  function handleBadgeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      navigate(ROUTES.profile)
    }
  }

  // Header search: Enter opens the products list filtered by the term (name / SKU)
  const [headerSearch, setHeaderSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      const term = headerSearch.trim()
      navigate(term ? `${ROUTES.products}?search=${encodeURIComponent(term)}` : ROUTES.products)
    } else if (event.key === 'Escape') {
      setHeaderSearch('')
      event.currentTarget.blur()
    }
  }
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

  // Bell dot only when there are real stock alerts (low or out of stock)
  const stockAlerts = summary ? summary.lowStock + summary.outOfStock : 0

  return (
    <ToastContext value={toastContext}>
      <PillActionsContext value={pillActions}>
        {/* macOS Contained Window Frame */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-300/60 overflow-hidden flex flex-col relative mb-4">
          {/* Window Header / macOS Chrome */}
          <div className="w-full bg-slate-50 border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between gap-4 select-none">
            <div className="flex items-center gap-3.5">
              {/* Traffic Light Controls */}
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-600/30 inline-block shadow-xs cursor-pointer hover:opacity-80" />
                <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600/30 inline-block shadow-xs cursor-pointer hover:opacity-80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600/30 inline-block shadow-xs cursor-pointer hover:opacity-80" />
              </div>
              <div className="h-4 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[13px]">{shell.titleIcon ?? 'layers'}</span>
                </div>
                <span>{shell.title}</span>
              </div>
            </div>
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1.5 text-slate-400 text-[16px]">search</span>
                <input className="w-full pl-8 pr-12 py-1 text-xs bg-white border border-slate-200/90 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" onChange={(e) => setHeaderSearch(e.target.value)} onKeyDown={handleSearchKeyDown} placeholder={shell.searchPlaceholder ?? 'Search products by name or SKU...'} ref={searchInputRef} type="text" value={headerSearch} />
                <kbd className="absolute right-2 top-1 px-1.5 py-0.2 text-[10px] font-medium font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">⌘K</kbd>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button className="relative p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors" onClick={() => navigate(ROUTES.dashboard)} title={!summary ? 'Stock alerts' : stockAlerts > 0 ? `${stockAlerts} stock ${stockAlerts === 1 ? 'alert' : 'alerts'} (low / out of stock)` : 'No stock alerts'} type="button">
                <span className="material-symbols-outlined text-[18px]">notifications</span>
                {stockAlerts > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white" />}
              </button>
              <div className="h-4 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-2 cursor-pointer rounded-md hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" onClick={() => navigate(ROUTES.profile)} onKeyDown={handleBadgeKeyDown} role="button" tabIndex={0} title="Profile">
                <div className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-[11px] font-bold text-indigo-700">{initial}</div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">{name}</span>
                  <span className="text-[9px] text-slate-400 font-medium">{roleLabel}</span>
                </div>
              </div>
            </div>
          </div>


          <Outlet />
        </div>

        {/* Success Notification Toast */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700/80 ${shell.toastMotion}`} id="toastSuccess">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[17px]">check_circle</span>
            </div>
            <div>
              <div className="text-xs font-semibold" id="toastTitle">{toast.title}</div>
              <div className="text-[11px] text-slate-400" id="toastSubtitle">{toast.subtitle}</div>
            </div>
          </div>
        )}


      </PillActionsContext>
    </ToastContext>
  )
}
