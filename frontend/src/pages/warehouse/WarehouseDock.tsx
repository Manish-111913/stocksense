import { type MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { ROUTES } from '../../routes.ts'
import { DOCK_ITEMS } from './data.ts'

// Floating navigation dock, centered above the status bar
export function WarehouseDock() {
  const navigate = useNavigate()

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, to: string) {
    event.preventDefault()
    navigate(to)
  }

  return (
    <div className="fixed bottom-9 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="pointer-events-auto bg-white/90 backdrop-blur-xl px-2.5 py-1.5 rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200/90 flex items-center gap-1">
        {DOCK_ITEMS.map((item) => (
          <a className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center" href="#" key={item.title} onClick={(e) => handleNavClick(e, item.to)} title={item.title}>
            <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
          </a>
        ))}
        {/* Active Warehouse icon in Dock */}
        <a className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm flex items-center justify-center" href="#" onClick={(e) => handleNavClick(e, ROUTES.warehouse)} title="Warehouse">
          <span className="material-symbols-outlined text-[19px]">warehouse</span>
        </a>
      </div>
    </div>
  )
}
