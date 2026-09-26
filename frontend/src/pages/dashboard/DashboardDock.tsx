import { type MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { DOCK_ITEMS } from './data.ts'

// Pinned floating bottom navigation dock
export function DashboardDock() {
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
        {DOCK_ITEMS.map((item) => (
          <a
            className={item.badge ? 'relative flex flex-col items-center px-3 py-1 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all' : 'flex flex-col items-center px-3 py-1 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all'}
            href="#"
            key={item.label}
            onClick={(e) => handleNavClick(e, item.to)}
          >
            {item.badge && <span className={item.badgeClassName}>{item.badge}</span>}
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="font-label-sm text-[10px] leading-tight">{item.label}</span>
          </a>
        ))}
        <div className="w-px h-6 bg-surface-container-high mx-1" />
        <button className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-all" title="Inventory AI Assistant" type="button">
          <span className="material-symbols-outlined text-[18px]">smart_toy</span>
        </button>
      </div>
    </div>
  )
}
