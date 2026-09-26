import { type MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { useUserBadge } from '../../auth/useAuth.ts'
import { HEADER_NAV_LINKS } from './data.ts'

export function DashboardHeader() {
  const { name, initial, roleLabel } = useUserBadge()
  const navigate = useNavigate()

  function handleNavClick(event: MouseEvent<HTMLAnchorElement>, to?: string) {
    event.preventDefault()
    if (to) navigate(to)
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest/95 backdrop-blur-md z-40 px-space-xl flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.04)] border-b border-surface-container">
      <div className="flex items-center gap-space-xl">
        <div className="flex items-center gap-space-sm cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-on-primary text-[20px]">inventory_2</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">StockSense</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-container text-primary font-mono">v2.4</span>
            </div>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          <a className="px-3 py-1.5 rounded-xl font-label-md text-label-md bg-primary-container text-on-primary font-semibold shadow-sm transition-all flex items-center gap-1.5" href="#" onClick={(e) => handleNavClick(e)}>
            <span className="material-symbols-outlined text-[16px]">dashboard</span>Dashboard
          </a>
          {HEADER_NAV_LINKS.map((link) => (
            <a className="px-3 py-1.5 rounded-xl font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all" href="#" key={link.label} onClick={(e) => handleNavClick(e, link.to)}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-space-base">
        <div className="relative hidden sm:flex items-center w-64">
          <span className="material-symbols-outlined absolute left-3 text-[18px] text-on-surface-variant">search</span>
          <input className="w-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-sm text-body-sm pl-9 pr-12 py-1.5 rounded-xl outline-none focus:bg-surface-container transition-all border border-transparent focus:border-surface-container-high" placeholder="Search inventory..." type="text" />
          <kbd className="absolute right-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-container text-on-surface-variant font-medium">⌘K</kbd>
        </div>
        <button className="relative p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-all" title="Notifications" type="button">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error" />
        </button>
        <div className="flex items-center gap-space-sm pl-2 cursor-pointer group rounded-xl p-1 hover:bg-surface-container-low transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-semibold text-body-sm shadow-sm">{initial}</div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="font-label-md text-label-md text-on-surface font-semibold leading-tight">{name}</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">{roleLabel}</span>
          </div>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-on-surface transition-colors">keyboard_arrow_down</span>
        </div>
      </div>
    </header>
  )
}
