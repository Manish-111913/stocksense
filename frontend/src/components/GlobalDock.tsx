import { useEffect, useState, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getDashboard } from '../api/dashboard.ts'
import { ROUTES } from '../routes.ts'

interface DockItem {
  label: string
  icon: string
  to: string
  badge?: 'pendingReceipts' | 'pendingDeliveries'
}

// The Dashboard's dock, used on every signed-in page (the only module navigation)
const DOCK_ITEMS: DockItem[] = [
  { label: 'Dashboard', icon: 'dashboard', to: ROUTES.dashboard },
  { label: 'Products', icon: 'inventory_2', to: ROUTES.products },
  { label: 'Receipts', icon: 'move_to_inbox', to: ROUTES.receipts, badge: 'pendingReceipts' },
  { label: 'Deliveries', icon: 'local_shipping', to: ROUTES.deliveries, badge: 'pendingDeliveries' },
  { label: 'Transfers', icon: 'sync_alt', to: ROUTES.transfers },
  { label: 'Adjustments', icon: 'tune', to: ROUTES.adjustments },
  { label: 'Move History', icon: 'history', to: ROUTES.moveHistory },
  { label: 'Warehouse', icon: 'warehouse', to: ROUTES.warehouse },
]

const BADGE_CLASS: Record<NonNullable<DockItem['badge']>, string> = {
  pendingReceipts: 'absolute -top-1 right-2 min-w-[18px] px-1 rounded-full bg-[#2170e4] text-white text-[10px] leading-[18px] text-center font-bold',
  pendingDeliveries: 'absolute -top-1 right-2 min-w-[18px] px-1 rounded-full bg-[#3525cd] text-white text-[10px] leading-[18px] text-center font-bold',
}

const REFRESH_MS = 60_000

const isActive = (pathname: string, to: string) => pathname === to || pathname.startsWith(`${to}/`)

/** Fixed module dock shared by every signed-in page */
export function GlobalDock() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [pending, setPending] = useState({ pendingReceipts: 0, pendingDeliveries: 0 })

  // Badge counts: re-read on every page change and once a minute
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { summary } = await getDashboard()
        if (!cancelled) setPending({ pendingReceipts: summary.pendingReceipts, pendingDeliveries: summary.pendingDeliveries })
      } catch {
        // Badges are optional; the dock still navigates
      }
    }
    void load()
    const timer = window.setInterval(() => void load(), REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [pathname])

  function go(event: MouseEvent<HTMLAnchorElement>, to: string) {
    event.preventDefault()
    if (pathname !== to) navigate(to)
  }

  return (
    <nav aria-label="Modules" className="fixed bottom-4 left-0 right-0 z-40 pointer-events-none flex justify-center px-4 font-sans" id="globalDock">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-xl rounded-[28px] px-4 py-2.5 shadow-2xl shadow-slate-400/30 flex items-center gap-1.5 border border-[#e5eeff]">
        {DOCK_ITEMS.map((item) => {
          const active = isActive(pathname, item.to)
          const count = item.badge ? pending[item.badge] : 0
          return (
            <a
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-1 min-w-[76px] px-4 py-2 rounded-2xl transition-all ${active ? 'bg-[#4f46e5] text-white shadow-md shadow-indigo-500/30' : 'text-[#464555] hover:text-[#0b1c30] hover:bg-[#eff4ff]'}`}
              href={item.to}
              key={item.label}
              onClick={(e) => go(e, item.to)}
              title={item.label}
            >
              {count > 0 && <span className={BADGE_CLASS[item.badge!]}>{count > 99 ? '99+' : count}</span>}
              <span className="material-symbols-outlined text-[22px] leading-none">{item.icon}</span>
              <span className={`text-[11px] leading-tight ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
