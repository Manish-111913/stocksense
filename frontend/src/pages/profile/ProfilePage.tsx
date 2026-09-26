import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { usePageChrome } from '../../hooks/usePageChrome.ts'
import { ROUTES } from '../../routes.ts'
import { ChangePasswordPanel } from './ChangePasswordPanel.tsx'
import {
  ACTIVE_FILTER_PILLS,
  CHECK_PATH,
  CHEVRON_DOWN_PATH,
  INITIAL_TOAST,
  LOCK_PATH,
  PENCIL_PATH,
  SEARCH_PATH,
  SHIELD_CHECK_PATH,
  type ToastState,
  USER_PATH,
} from './data.ts'
import { LogoutModal } from './LogoutModal.tsx'
import { ProfileDock } from './ProfileDock.tsx'
import { ProfileHeader } from './ProfileHeader.tsx'
import { ProfileToast } from './ProfileToast.tsx'
import { SessionDrawer } from './SessionDrawer.tsx'

const FIELD_CARD = 'p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between'
const FIELD_LABEL = 'text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1'
const FILTER_BTN = 'px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5'
const EDIT_INPUT = 'focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 border border-slate-200 rounded-md px-2 py-1 bg-white transition-all'

function ChevronDown() {
  return <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={CHEVRON_DOWN_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
}

export default function ProfilePage() {
  useDocumentTitle('StockSense — Account Profile & Security Settings v2.4')
  usePageChrome('bg-slate-100 text-slate-800 antialiased p-2 sm:p-4 md:p-6 min-h-screen flex flex-col justify-between select-none', 'ss-profile')
  const navigate = useNavigate()

  const [toast, setToast] = useState<ToastState>(INITIAL_TOAST)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const logoutTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const [fullName, setFullName] = useState('Manish Kumar')
  const [phone, setPhone] = useState('+91 98200 44812')
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState(fullName)
  const [draftPhone, setDraftPhone] = useState(phone)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const timers = logoutTimers.current
    return () => {
      clearTimeout(toastTimer.current)
      timers.forEach(clearTimeout)
    }
  }, [])

  useEffect(() => {
    if (isEditing) nameInputRef.current?.focus()
  }, [isEditing])

  function showToast(title: string, message: string, isError = false) {
    clearTimeout(toastTimer.current)
    setToast({ visible: true, title, message, isError })
    toastTimer.current = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3500)
  }

  function enableProfileEdit() {
    if (!isEditing) {
      setDraftName(fullName)
      setDraftPhone(phone)
      setIsEditing(true)
    } else {
      nameInputRef.current?.focus()
    }
  }

  function cancelProfileEdit() {
    setIsEditing(false)
  }

  function saveProfile() {
    const updatedName = draftName.trim()
    if (!updatedName) {
      showToast('Validation Error', 'Full Name cannot be empty.', true)
      return
    }
    setFullName(updatedName)
    setPhone(draftPhone.trim())
    setIsEditing(false)
    showToast('Profile Updated', 'Your profile details have been securely synchronized.')
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') saveProfile()
    if (event.key === 'Escape') cancelProfileEdit()
  }

  function confirmLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    logoutTimers.current.push(
      setTimeout(() => {
        setIsLogoutOpen(false)
        showToast('Signed Out', 'Session SS-9821 terminated. Redirecting to auth gateway...', false)
        logoutTimers.current.push(setTimeout(() => navigate(ROUTES.login), 1200))
      }, 900),
    )
  }

  return (
    <>
      {/* Notification Toast Container */}
      <ProfileToast toast={toast} />
      {/* MacOS Window Container */}
      <div className="w-full max-w-[1720px] mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/90 flex flex-col flex-1 overflow-hidden relative">
        <ProfileHeader onEditProfile={enableProfileEdit} />
        {/* Main Scrollable Body Content */}
        <main className="flex-1 p-5 md:p-6 bg-slate-50/50 overflow-y-auto pb-28">
          {/* Breadcrumbs & Operations Sub-Header */}
          <div className="mb-5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
              <span className="hover:text-slate-800 cursor-pointer">Operations</span>
              <span className="text-slate-400">/</span>
              <span className="hover:text-slate-800 cursor-pointer">Settings</span>
              <span className="text-slate-400">/</span>
              <span className="font-mono text-brand-600 font-semibold">/profile</span>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">My Profile</h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Account
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-xs font-semibold">
                    Enterprise Inventory Admin
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
                  Manage your StockSense account information, security credentials, and active session.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                <button className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all flex items-center gap-1.5" type="button">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                  Export Audit Log
                </button>
                <button className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5" id="toggleEditFormBtn" onClick={enableProfileEdit} type="button">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={PENCIL_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
          {/* Screen Mode Preview Banner */}
          <div className="mb-5 p-3 px-4 rounded-xl bg-indigo-50/70 border border-indigo-100/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700">
              <span className="w-6 h-6 rounded-md bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={SHIELD_CHECK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
              </span>
              <span>
                <strong className="font-semibold text-brand-800">Screen Mode Preview:</strong> Verified administrative credentials and security identity across enterprise nodes
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Session Active
              </span>
              <button className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white text-slate-700 border border-indigo-200 hover:bg-indigo-50 shadow-sm transition-colors">
                All Privileges
              </button>
              <button className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white text-slate-700 border border-indigo-200 hover:bg-indigo-50 shadow-sm transition-colors">
                Export Security Log
              </button>
              <button className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition-colors flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                Inspect #SS-9821
              </button>
            </div>
          </div>
          {/* 5 KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-5">
            {/* KPI 1 */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Account Status</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                </div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Active
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Identity verified via Auth Core
                </div>
              </div>
            </div>
            {/* KPI 2 */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Role &amp; Clearance</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={SHIELD_CHECK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                </div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-emerald-600 tracking-tight">Admin</div>
                <div className="text-xs text-slate-500 mt-1">Full CRUD on catalog &amp; hubs</div>
              </div>
            </div>
            {/* KPI 3 */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Auth Credentials</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={LOCK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                </div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-slate-900 tracking-tight">Password Set</div>
                <div className="text-xs text-slate-500 mt-1">Last rotated 42 days ago</div>
              </div>
            </div>
            {/* KPI 4: Highlighted Primary Card with Indigo Accent Border */}
            <div className="bg-gradient-to-b from-indigo-50/50 to-white rounded-xl p-4 border-2 border-brand-600 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700">Primary Node</span>
                <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />
                  Active Session
                </span>
              </div>
              <div>
                <div className="text-xl font-bold font-mono text-brand-600 truncate">#SS-9821</div>
                <div className="text-xs text-brand-800/70 font-medium mt-1">Bhiwandi Gateway · Node v18.19</div>
              </div>
            </div>
            {/* KPI 5 */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Security Health</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={SHIELD_CHECK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                </div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-emerald-600 tracking-tight">100%</div>
                <div className="text-xs text-slate-500 mt-1">Zero active vulnerabilities</div>
              </div>
            </div>
          </div>
          {/* Filter & Search Controls Bar */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm mb-5">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              {/* Main Search Input */}
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={SEARCH_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                </div>
                <input className="w-full pl-9 pr-14 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition-all" placeholder="Search profile attributes, sessions, audit events..." type="text" />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-sm">⌘F</kbd>
              </div>
              {/* Dropdown Selectors */}
              <div className="flex flex-wrap items-center gap-2">
                <button className={FILTER_BTN} type="button">
                  <span>Session Status: <strong className="font-semibold text-slate-900">Active (1)</strong></span>
                  <ChevronDown />
                </button>
                <button className={FILTER_BTN} type="button">
                  <span>Access Tier: All Tiers</span>
                  <ChevronDown />
                </button>
                <button className={FILTER_BTN} type="button">
                  <span>Region: Bhiwandi Gateway</span>
                  <ChevronDown />
                </button>
                <button className={FILTER_BTN} type="button">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                  <span>Last 30 Days</span>
                  <ChevronDown />
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors" title="Reset Filters" type="button">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                </button>
              </div>
            </div>
            {/* Active Filter Pills & Results Count */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {ACTIVE_FILTER_PILLS.map((pill) => (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200 text-[11px]" key={pill}>
                    {pill}
                    <span className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs ml-0.5">×</span>
                  </span>
                ))}
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                Account Security Standing: <strong className="text-emerald-600 font-semibold font-sans">Optimal</strong>
              </div>
            </div>
          </div>
          {/* Main Workspace Split: Left Main Details + Right Inspection Drawer */}
          <div className="flex flex-col xl:flex-row gap-5 items-start">
            {/* Left: Profile Directory & Parameters Container */}
            <div className="w-full flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {/* Table Header Style */}
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={USER_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Profile Details &amp; Operational Parameters</h2>
                    <p className="text-xs text-slate-500">Authenticated user identity, facility routing bindings, and credential keys.</p>
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    IDENTITY VERIFIED
                  </span>
                  <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500 pl-2 border-l border-slate-200">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-600" /> Verified Staff</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Admin Privileges</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Session Locked</span>
                  </div>
                </div>
              </div>
              {/* User Identity Banner Block */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/40 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-700 to-indigo-500 text-white font-bold text-2xl flex items-center justify-center shadow-md">
                      M
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white" title="Verified Staff">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={CHECK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /></svg>
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900" id="displayProfileNameHeader">{fullName}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">Verified Staff</span>
                      <span className="px-2 py-0.5 rounded bg-brand-100 text-brand-800 font-mono text-[10px] font-semibold">L4 Staff</span>
                    </div>
                    <div className="text-xs font-mono text-slate-500 mt-0.5">manish.admin@stocksense.internal</div>
                    <div className="text-xs text-slate-400 mt-0.5">Chief Inventory Administrator · Warehouse Operations Network</div>
                  </div>
                </div>
                <button className="self-start sm:self-center px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors shadow-sm flex items-center gap-1.5" id="quickEditBtn" onClick={enableProfileEdit} type="button">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={PENCIL_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                  Edit Details
                </button>
              </div>
              {/* Structured Details Grid */}
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Field 1 */}
                  <div className={FIELD_CARD}>
                    <span className={FIELD_LABEL}>Full Name</span>
                    <div className="font-medium text-slate-900 text-sm flex items-center justify-between">
                      {isEditing ? (
                        <input className={`flex-1 min-w-0 mr-3 text-sm font-medium text-slate-900 ${EDIT_INPUT}`} id="inputFullName" onChange={(e) => setDraftName(e.target.value)} onKeyDown={handleEditKeyDown} ref={nameInputRef} type="text" value={draftName} />
                      ) : (
                        <span>{fullName}</span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">STK-USER-001</span>
                    </div>
                  </div>
                  {/* Field 2 */}
                  <div className={FIELD_CARD}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Work Email</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={LOCK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                        Managed by org
                      </span>
                    </div>
                    <div className="font-mono text-slate-700 text-xs">manish.admin@stocksense.internal</div>
                  </div>
                  {/* Field 3 */}
                  <div className={FIELD_CARD}>
                    <span className={FIELD_LABEL}>Employee ID / Staff Code</span>
                    <div className="font-mono font-medium text-slate-900 text-xs flex items-center justify-between">
                      <span>STK-ADM-042</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">Authorized</span>
                    </div>
                  </div>
                  {/* Field 4 */}
                  <div className={FIELD_CARD}>
                    <span className={FIELD_LABEL}>Assigned Hub / Primary Facility</span>
                    <div className="font-medium text-brand-700 text-xs flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-brand-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                      <span>Main Warehouse (West Hub) — Bhiwandi Logistics Corridor</span>
                    </div>
                  </div>
                  {/* Field 5 */}
                  <div className={FIELD_CARD}>
                    <span className={FIELD_LABEL}>Direct Contact</span>
                    <div className="font-mono font-medium text-slate-800 text-xs">
                      {isEditing ? (
                        <input className={`w-full font-mono text-xs font-medium text-slate-800 ${EDIT_INPUT}`} id="inputPhone" onChange={(e) => setDraftPhone(e.target.value)} onKeyDown={handleEditKeyDown} type="tel" value={draftPhone} />
                      ) : (
                        phone
                      )}
                    </div>
                  </div>
                  {/* Field 6 */}
                  <div className={FIELD_CARD}>
                    <span className={FIELD_LABEL}>Tenure &amp; Verification</span>
                    <div className="font-medium text-slate-800 text-xs flex items-center justify-between">
                      <span>14 January 2025 (8 months active)</span>
                      <span className="text-emerald-600 font-semibold">Level 4 Clear</span>
                    </div>
                  </div>
                </div>
                {/* Profile edit actions (shown while editing) */}
                {isEditing && (
                  <div className="flex items-center justify-end gap-2" id="profileEditActions">
                    <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-colors" id="cancelEditProfileBtn" onClick={cancelProfileEdit} type="button">
                      Cancel
                    </button>
                    <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors" onClick={saveProfile} type="button">
                      Save Changes
                    </button>
                  </div>
                )}
                {/* Security Credentials Row within Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-brand-600 shadow-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={LOCK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">Master Password</span>
                        <span className="font-mono text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">Updated 42 days ago</span>
                      </div>
                      <div className="font-mono text-slate-500 tracking-widest mt-0.5">••••••••••••••••</div>
                    </div>
                  </div>
                  <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-colors" id="toggleChangePasswordBtn" onClick={() => setIsPasswordOpen((open) => !open)} type="button">
                    Change Password
                  </button>
                </div>
                <ChangePasswordPanel
                  isOpen={isPasswordOpen}
                  onChanged={() => showToast('Password Changed', 'Master password has been updated and hashed via Argon2.')}
                  onClose={() => setIsPasswordOpen(false)}
                />
              </div>
              {/* Table Footer Style */}
              <div className="p-3.5 px-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs mt-auto">
                <div className="flex items-center gap-2 text-slate-500">
                  <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={SHIELD_CHECK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                  <span>All administrative actions enforce strict multi-factor verification and immutable movement ledger bindings.</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] text-slate-500">
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200">SHA-256 Auth Verified</span>
                </div>
              </div>
            </div>
            {/* Right Slide-Over / Verification Panel (#SS-9821 Active Session) */}
            <SessionDrawer onLogout={() => setIsLogoutOpen(true)} />
          </div>
        </main>
        {/* Bottom System Telemetry Status Bar */}
        <footer className="h-7 bg-slate-100 border-t border-slate-200 px-4 flex items-center justify-between text-[11px] font-mono text-slate-500 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">Synced: Bengaluru Central Hub · Active SKUs: 148 · Latency: 24ms · Operational Core · Automated Reorder: Active</span>
            <span className="sm:hidden">Synced: Bengaluru Central · Latency: 24ms</span>
          </div>
          <div className="flex items-center gap-3">
            <span>SSL 256-bit</span>
            <span>Node v18.19</span>
          </div>
        </footer>
      </div>
      <ProfileDock />
      <LogoutModal isLoggingOut={isLoggingOut} isOpen={isLogoutOpen} onCancel={() => setIsLogoutOpen(false)} onConfirm={confirmLogout} />
    </>
  )
}
