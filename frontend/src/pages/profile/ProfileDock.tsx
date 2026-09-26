import { type MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { ROUTES } from '../../routes.ts'
import { DOCK_ITEMS, USER_PATH } from './data.ts'

// Bottom floating macOS dock
export function ProfileDock() {
  const navigate = useNavigate()

  function go(event: MouseEvent<HTMLAnchorElement>, to: string) {
    event.preventDefault()
    navigate(to)
  }

  return (
    <div className="fixed bottom-9 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div className="pointer-events-auto bg-white/90 backdrop-blur-xl px-2.5 py-1.5 rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200/90 flex items-center gap-1">
        {DOCK_ITEMS.map((item) => (
          <a className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center" href="#" key={item.title} onClick={(e) => go(e, item.to)} title={item.title}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={item.path} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
          </a>
        ))}
        {/* Profile & Account Active Dock Item */}
        <a className="p-2 rounded-xl bg-brand-600 text-white shadow-sm flex items-center justify-center" href="#" onClick={(e) => go(e, ROUTES.profile)} title="Profile & Account">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={USER_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
        </a>
      </div>
    </div>
  )
}
