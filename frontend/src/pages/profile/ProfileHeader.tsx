import { type MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { useUserBadge } from '../../auth/useAuth.ts'
import { ROUTES } from '../../routes.ts'
import { NAV_TABS, SEARCH_PATH, USER_PATH } from './data.ts'

const TAB = 'px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors'

// macOS window chrome header with search, user actions and the module tab bar
export function ProfileHeader({ onEditProfile }: { onEditProfile: () => void }) {
  const { user, name, initial, roleLabel } = useUserBadge()
  const navigate = useNavigate()

  function go(event: MouseEvent<HTMLAnchorElement>, to: string) {
    event.preventDefault()
    navigate(to)
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="h-14 px-5 flex items-center justify-between gap-4">
        {/* Traffic lights & Title */}
        <div className="flex items-center gap-4 min-w-[280px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#f59e0b] inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#10b981] inline-block shadow-sm" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center text-white shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">StockSense</span>
            <span className="text-slate-300">—</span>
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Account Profile &amp; Security Settings v2.4</span>
          </div>
        </div>
        {/* Global Search Bar */}
        <div className="flex-1 max-w-lg mx-2 hidden md:block">
          <div className="relative flex items-center">
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={SEARCH_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            </div>
            <input className="w-full pl-9 pr-14 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition-all" placeholder="Search account, security, audit settings..." type="text" />
            <kbd className="absolute right-2 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white border border-slate-200 rounded shadow-sm">⌘K</kbd>
          </div>
        </div>
        {/* Right User Actions */}
        <div className="flex items-center gap-3">
          <button aria-label="Notifications" className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors" type="button">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2 pl-1">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">{name}</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{roleLabel}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-600 text-white font-semibold flex items-center justify-center text-xs shadow-sm" title={user?.email}>
              {initial}
            </div>
          </div>
        </div>
      </div>
      {/* Pinned Sub-Navigation Tab Bar */}
      <div className="px-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between overflow-x-auto gap-4 py-1.5">
        <nav className="flex items-center gap-1 shrink-0">
          {NAV_TABS.map((tab) => (
            <a className={TAB} href="#" key={tab.label} onClick={(e) => go(e, tab.to)}>
              {tab.label}
            </a>
          ))}
          {/* Actively Selected Profile Tab */}
          <a className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white shadow-sm transition-all flex items-center gap-1.5" href="#" onClick={(e) => go(e, ROUTES.profile)}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={USER_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            Profile &amp; Account
          </a>
        </nav>
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">/profile</span>
          <button className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all flex items-center gap-1.5" onClick={onEditProfile} type="button">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            Edit Profile
          </button>
        </div>
      </div>
    </header>
  )
}
