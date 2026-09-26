import { useCallback, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { PillActionsContext, type PillActionRegistry } from '../context/pillActions.ts'
import { ToastContext } from '../context/toast.ts'
import { usePageChrome } from '../hooks/usePageChrome.ts'
import { useActiveSkuCount } from '../pages/products/productsData.ts'
import { ROUTES } from '../routes.ts'

type ModuleKey = 'dashboard' | 'products' | 'receipts' | 'deliveries' | 'transfers' | 'adjustments' | 'warehouse' | 'directory'

/**
 * The original screens come in two shell revisions:
 * - classic: Products / Receipts / Deliveries
 * - v2: Transfers / Adjustments (extra Directory tab, transfer counts, "(Active)" dock tooltips, other toast copy)
 */
type ShellVariant = 'classic' | 'v2'

interface ModuleItem {
  key: ModuleKey
  label: string
  icon: string
  /** Modules without a screen yet show a toast instead of navigating */
  to?: string
}

const MODULES: ModuleItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', to: ROUTES.dashboard },
  { key: 'products', label: 'Products', icon: 'inventory_2', to: ROUTES.products },
  { key: 'receipts', label: 'Receipts', icon: 'receipt_long', to: ROUTES.receipts },
  { key: 'deliveries', label: 'Deliveries', icon: 'local_shipping', to: ROUTES.deliveries },
  { key: 'transfers', label: 'Transfers', icon: 'sync_alt', to: ROUTES.transfers },
  { key: 'adjustments', label: 'Adjustments', icon: 'tune', to: ROUTES.adjustments },
  { key: 'warehouse', label: 'Warehouse', icon: 'warehouse', to: ROUTES.warehouse },
]

const DIRECTORY_TAB: ModuleItem = { key: 'directory', label: 'Directory', icon: 'folder_shared' }

interface PillItem {
  icon: string
  label: string
  /** Route to open; items without one run the page action registered via usePillAction */
  to?: string
  action?: string
}

interface PillVariant {
  containerClass: string
  activeClass: string
  items: PillItem[]
}

const PILL_INACTIVE = 'px-2.5 py-1 rounded-md font-medium transition-all text-slate-600 hover:text-slate-900 flex items-center gap-1'
const PILL_ACTIVE_BORDERED = 'px-2.5 py-1 rounded-md font-semibold transition-all bg-white shadow-xs text-indigo-700 flex items-center gap-1 border border-slate-200/50'
const PILL_CONTAINER = 'flex items-center gap-1 text-[11px] bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/70 shadow-xs flex-shrink-0'
const PILL_CONTAINER_SM = 'hidden sm:flex items-center gap-1 text-[11px] bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/70 shadow-xs flex-shrink-0'

// Quick view switcher pills, as they appear on each original screen
const PRODUCTS_PILL: PillVariant = {
  containerClass: 'hidden sm:flex items-center gap-1 text-[11px] bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60',
  activeClass: 'px-2.5 py-1 rounded-md font-semibold transition-all bg-white shadow-xs text-indigo-700 flex items-center gap-1',
  items: [
    { icon: 'table_rows', label: 'Directory', to: ROUTES.products },
    { icon: 'add_circle', label: '/products/new', to: ROUTES.productNew },
  ],
}

const detailPill = (sku: string): PillVariant => ({
  containerClass: PILL_CONTAINER,
  activeClass: PILL_ACTIVE_BORDERED,
  items: [
    { icon: 'table_rows', label: 'Directory', to: ROUTES.products },
    { icon: 'add_circle', label: '+ Add Product', to: ROUTES.productNew },
    { icon: 'info', label: `/products/${sku}`, to: `/products/${sku}` },
    { icon: 'add_shopping_cart', label: '/receipts/new', to: ROUTES.receiptNew },
  ],
})

const RECEIPTS_PILL: PillVariant = {
  containerClass: PILL_CONTAINER_SM,
  activeClass: PILL_ACTIVE_BORDERED,
  items: [
    { icon: 'table_rows', label: 'Directory', to: ROUTES.receipts },
    { icon: 'add_circle', label: '+ New Receipt', to: ROUTES.receiptNew },
  ],
}

const DELIVERIES_PILL: PillVariant = {
  containerClass: PILL_CONTAINER_SM,
  activeClass: PILL_ACTIVE_BORDERED,
  items: [
    { icon: 'table_rows', label: 'Directory', to: ROUTES.deliveries },
    { icon: 'add_circle', label: '+ New Delivery', action: 'new-delivery' },
  ],
}

const TRANSFERS_PILL: PillVariant = {
  containerClass: PILL_CONTAINER,
  activeClass: PILL_ACTIVE_BORDERED,
  items: [
    { icon: 'swap_horiz', label: '/transfers', to: ROUTES.transfers },
    { icon: 'add_circle', label: '+ New Transfer', action: 'new-transfer' },
    { icon: 'info', label: '/transfers/00142', action: 'transfer-detail' },
  ],
}

const ADJUSTMENTS_PILL: PillVariant = {
  containerClass: PILL_CONTAINER,
  activeClass: PILL_ACTIVE_BORDERED,
  items: [
    { icon: 'tune', label: '/adjustments', to: ROUTES.adjustments },
    { icon: 'add_circle', label: '+ New Adjustment', action: 'new-adjustment' },
    { icon: 'info', label: '/adjustments/0089', action: 'adjustment-detail' },
  ],
}

interface ShellConfig {
  title: string
  module: ModuleKey
  variant: ShellVariant
  pill: PillVariant
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
      return { title: 'StockSense — Receipts Management', module: 'receipts', variant: 'classic', pill: RECEIPTS_PILL, bodyPadding: 'pb-32', toastMotion: 'transition-all duration-300', toastMs: 3800 }
    case ROUTES.receiptNew:
      return { title: 'StockSense — Receipts Management', module: 'receipts', variant: 'classic', pill: detailPill('STL-001'), bodyPadding: 'pb-28', ...CLASSIC_TOAST }
    case ROUTES.deliveries:
      return { title: 'StockSense — Delivery Orders', module: 'deliveries', variant: 'classic', pill: DELIVERIES_PILL, bodyPadding: 'pb-32', toastMotion: 'transition-all duration-300', toastMs: 3500 }
    case ROUTES.transfers:
      return { title: 'StockSense — Internal Transfers', module: 'transfers', variant: 'v2', titleIcon: 'swap_horiz', searchPlaceholder: 'Search catalog, SKUs, or transfer batch...', pill: TRANSFERS_PILL, bodyPadding: 'pb-32', toastMotion: 'transition-all duration-200', toastMs: 3500 }
    case ROUTES.adjustments:
      return { title: 'StockSense — Inventory Adjustments', module: 'adjustments', variant: 'v2', titleIcon: 'tune', searchPlaceholder: 'Search catalog, SKUs, or transfer batch...', pill: ADJUSTMENTS_PILL, bodyPadding: 'pb-32', toastMotion: 'transition-all duration-200', toastMs: 3500 }
    case ROUTES.products:
    case ROUTES.productNew:
      return { title: 'StockSense — Products Management', module: 'products', variant: 'classic', pill: PRODUCTS_PILL, bodyPadding: 'pb-28', ...CLASSIC_TOAST }
    default: {
      const sku = pathname.split('/')[2] ?? 'STL-001'
      return { title: 'StockSense — Products Management', module: 'products', variant: 'classic', pill: detailPill(sku), bodyPadding: 'pb-28', ...CLASSIC_TOAST }
    }
  }
}

/** Count badge next to a module tab */
function navCount(key: ModuleKey, variant: ShellVariant, isActive: boolean): number | undefined {
  if (key === 'receipts') return 12
  if (key === 'deliveries') return 8
  if (key === 'transfers' && variant === 'v2') return 24
  if (key === 'adjustments' && variant === 'v2' && isActive) return 18
  return undefined
}

const NAV_ACTIVE = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 transition-all flex items-center gap-1.5'
const NAV_INACTIVE = 'px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center gap-1.5'
const NAV_COUNT_INACTIVE = 'px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold'
const NAV_COUNT_ACTIVE: Record<ShellVariant, string> = {
  classic: 'px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold',
  v2: 'px-1.5 py-0.2 rounded-full bg-indigo-200/60 text-indigo-800 text-[10px] font-semibold',
}
const DOCK_ACTIVE = 'relative p-2 rounded-full bg-indigo-600 text-white shadow-sm group'
const DOCK_INACTIVE = 'relative p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all group'
const DOCK_TOOLTIP = 'absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none'

function dockTitle(item: ModuleItem, variant: ShellVariant, isActive: boolean): string {
  if (item.key === 'warehouse') return 'Warehouse Map'
  if (item.key === 'transfers' && variant === 'v2') return 'Internal Transfers'
  if (item.key === 'adjustments' && variant === 'v2' && isActive) return 'Inventory Adjustments'
  return item.label
}

interface ToastState {
  title: string
  subtitle: string
}

// Shared window frame for the module screens: title bar, module tabs, view pill, dock, footer, toast
export default function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const shell = shellConfigFor(pathname)
  const { variant } = shell
  usePageChrome(`bg-slate-100/90 text-slate-800 antialiased font-sans min-h-screen p-3 sm:p-5 lg:p-7 flex flex-col items-center justify-start selection:bg-indigo-500 selection:text-white ${shell.bodyPadding}`, 'ss-app')
  const activeSkuCount = useActiveSkuCount()

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

  const showModuleAlert = useCallback(
    (moduleName: string) =>
      variant === 'v2'
        ? showToast(`Navigated to ${moduleName}`, `Switched workspace view to ${moduleName}.`)
        : showToast(`Workspace: ${moduleName}`, `Switching operational view to ${moduleName}.`),
    [showToast, variant],
  )

  const toastContext = useMemo(() => ({ showToast, showModuleAlert }), [showToast, showModuleAlert])

  function openModule(item: ModuleItem) {
    if (item.to) navigate(item.to)
    else showModuleAlert(item.label)
  }

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, item: ModuleItem) {
    event.preventDefault()
    openModule(item)
  }

  function handlePillClick(item: PillItem) {
    if (item.to) navigate(item.to)
    else if (item.action) pillActions.get(item.action)?.()
  }

  const navItems = variant === 'v2' ? [...MODULES, DIRECTORY_TAB] : MODULES

  return (
    <ToastContext value={toastContext}>
      <PillActionsContext value={pillActions}>
        {/* macOS Contained Window Frame */}
        <div className="w-full max-w-7xl bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-300/60 overflow-hidden flex flex-col relative mb-4">
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
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-200/70 text-slate-600 tracking-wide uppercase">v2.4</span>
              </div>
            </div>
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1.5 text-slate-400 text-[16px]">search</span>
                <input className="w-full pl-8 pr-12 py-1 text-xs bg-white border border-slate-200/90 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder={shell.searchPlaceholder ?? 'Search inventory, SKU, or batch ID...'} type="text" />
                <kbd className="absolute right-2 top-1 px-1.5 py-0.2 text-[10px] font-medium font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">⌘K</kbd>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button className="relative p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors" title="Notifications">
                <span className="material-symbols-outlined text-[18px]">notifications</span>
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
              <div className="h-4 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-[11px] font-bold text-indigo-700">M</div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">Manish</span>
                  <span className="text-[9px] text-slate-400 font-medium">Inventory Admin</span>
                </div>
              </div>
            </div>
          </div>

          {/* Workspace Sub-navigation Tabs */}
          <div className="w-full bg-white border-b border-slate-200/70 px-4 sm:px-6 py-2 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
            <nav className="flex items-center gap-1 flex-shrink-0">
              {navItems.map((item) => {
                const isActive = item.key === shell.module
                const count = navCount(item.key, variant, isActive)
                return (
                  <a className={isActive ? NAV_ACTIVE : NAV_INACTIVE} href="#" key={item.key} onClick={(e) => handleNavClick(e, item)}>
                    <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                    <span>{item.label}</span>
                    {count !== undefined && <span className={isActive ? NAV_COUNT_ACTIVE[variant] : NAV_COUNT_INACTIVE}>{count}</span>}
                  </a>
                )
              })}
            </nav>
            {/* Quick view state switcher pill */}
            <div className={shell.pill.containerClass}>
              {shell.pill.items.map((item) => (
                <button className={item.to === pathname ? shell.pill.activeClass : PILL_INACTIVE} key={item.label} onClick={() => handlePillClick(item)}>
                  <span className="material-symbols-outlined text-[14px]">{item.icon}</span> {item.label}
                </button>
              ))}
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

        {/* Pinned Floating macOS Navigation Dock */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border border-slate-200/70 flex items-center gap-2">
            {MODULES.map((item) => {
              const isActive = item.key === shell.module
              const count = item.key === 'receipts' ? 12 : item.key === 'deliveries' ? 8 : item.key === 'transfers' && variant === 'v2' ? 24 : undefined
              // Only Receipts/Deliveries carry a corner badge (and the Deliveries screen's Receipts button has none)
              const showBadge = !isActive && (item.key === 'receipts' || item.key === 'deliveries') && !(shell.module === 'deliveries' && item.key === 'receipts')
              const tooltip = isActive && variant === 'v2' ? `${item.label} (Active)` : count !== undefined ? `${item.label} (${count})` : item.label
              return (
                <button className={isActive ? DOCK_ACTIVE : DOCK_INACTIVE} key={item.key} onClick={() => openModule(item)} title={dockTitle(item, variant, isActive)}>
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {isActive && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  {showBadge && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center">{count}</span>}
                  <span className={DOCK_TOOLTIP}>{tooltip}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Pinned Bottom System Telemetry Strip */}
        <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 border-t border-slate-200/80 px-4 sm:px-6 py-2 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Synced: Bengaluru Central Hub</span>
            <span className="text-slate-300">·</span>
            <span id="telemetrySkus">Active SKUs: {activeSkuCount}</span>
            <span className="text-slate-300">·</span>
            <span>Latency: 24ms</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">Operational Core</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600">Automated Reorder: Active</span>
          </div>
        </footer>
      </PillActionsContext>
    </ToastContext>
  )
}
