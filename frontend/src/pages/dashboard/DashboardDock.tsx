import { type MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import type { DashboardSummary } from '../../api/types.ts'
import { DOCK_ITEMS } from './data.ts'

interface DashboardDockProps {
  /** Pending receipt / delivery counts for the badges (none until loaded) */
  summary: DashboardSummary | null
}

// Pinned floating bottom navigation dock
export function DashboardDock({ summary }: DashboardDockProps) {
  const navigate = useNavigate()

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, to?: string) {
    event.preventDefault()
    if (to) navigate(to)
  }

  return (
    <div className="fixed bottom-10 left-0 right-0 z-40 pointer-events-none flex justify-center px-4">
      <div className="pointer-events-auto bg-surface-container-lowest/95 backdrop-blur-xl rounded-full px-3 py-1.5 shadow-xl flex items-center gap-1 border border-surface-container">
        <a className="flex flex-col items-center px-3 py-1 rounded-xl bg-primary-container text-on-primary transition-all" href="#" onClick={(e) => handleNavClick(e)}>
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
          <span className="font-label-sm text-[10px] leading-tight font-semibold">Dashboard</span>
        </a>
        {DOCK_ITEMS.map((item) => {
          const count = item.badgeKey && summary ? summary[item.badgeKey] : 0
          return (
            <a
              className={count > 0 ? 'relative flex flex-col items-center px-3 py-1 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all' : 'flex flex-col items-center px-3 py-1 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all'}
              href="#"
              key={item.label}
              onClick={(e) => handleNavClick(e, item.to)}
            >
              {count > 0 && <span className={item.badgeClassName}>{count > 99 ? '99+' : count}</span>}
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-label-sm text-[10px] leading-tight">{item.label}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
