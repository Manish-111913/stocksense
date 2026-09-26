import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { fetchMe, logout, updateMe } from '../../api/auth.ts'
import { ApiError } from '../../api/client.ts'
import { ROLE_LABEL } from '../../api/types.ts'
import { useCurrentUser } from '../../auth/useAuth.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { usePageChrome } from '../../hooks/usePageChrome.ts'
import { ROUTES } from '../../routes.ts'
import { ChangePasswordPanel } from './ChangePasswordPanel.tsx'
import {
  CHECK_PATH,
  CLOCK_PATH,
  describeThisDevice,
  formatDate,
  formatDateTime,
  INITIAL_TOAST,
  initialsOf,
  LOCK_PATH,
  MONITOR_PATH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PASSWORD_MIN_LENGTH,
  PENCIL_PATH,
  PHONE_MAX_LENGTH,
  PHONE_PATTERN,
  SHIELD_CHECK_PATH,
  tenureOf,
  type ToastState,
  USER_PATH,
} from './data.ts'
import { LogoutModal } from './LogoutModal.tsx'
import { ProfileHeader } from './ProfileHeader.tsx'
import { ProfileToast } from './ProfileToast.tsx'
import { SessionDrawer } from './SessionDrawer.tsx'

const FIELD_CARD = 'p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between'
const FIELD_LABEL = 'text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1'
const EDIT_INPUT = 'focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 border border-slate-200 rounded-md px-2 py-1 bg-white transition-all'

type LoadState = { key: number; state: 'ready' | 'error'; message?: string }

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

export default function ProfilePage() {
  useDocumentTitle('StockSense — Account Profile & Security Settings')
  usePageChrome('bg-slate-100 text-slate-800 antialiased pt-3 sm:pt-4 px-3 sm:px-4 pb-4 min-h-screen flex flex-col justify-between select-none', 'ss-profile')
  const navigate = useNavigate()
  // Signed-in profile from the session store; refreshed from GET /users/me on mount (fetchMe updates the store)
  const user = useCurrentUser()
  const [reloadKey, setReloadKey] = useState(0)
  const [loaded, setLoaded] = useState<LoadState | null>(null)
  const loadState = loaded?.key === reloadKey ? loaded.state : 'loading'

  const [toast, setToast] = useState<ToastState>(INITIAL_TOAST)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [draftName, setDraftName] = useState('')
  const [draftPhone, setDraftPhone] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const fullName = user?.fullName ?? ''
  const phone = user?.phone ?? ''
  const roleLabel = user ? ROLE_LABEL[user.role] : ''
  const isActive = user?.status === 'ACTIVE'
  const device = describeThisDevice()
  const tenure = tenureOf(user?.createdAt)

  useEffect(() => {
    return () => clearTimeout(toastTimer.current)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then(() => {
        if (!cancelled) setLoaded({ key: reloadKey, state: 'ready' })
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoaded({ key: reloadKey, state: 'error', message: errorMessage(err, 'Could not load your profile. Please try again.') })
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  useEffect(() => {
    if (isEditing) nameInputRef.current?.focus()
  }, [isEditing])

  function showToast(title: string, message: string, isError = false) {
    clearTimeout(toastTimer.current)
    setToast({ visible: true, title, message, isError })
    toastTimer.current = setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3500)
  }

  function enableProfileEdit() {
    if (!user) return
    if (!isEditing) {
      setDraftName(fullName)
      setDraftPhone(phone)
      setEditError('')
      setIsEditing(true)
    } else {
      nameInputRef.current?.focus()
    }
  }

  function cancelProfileEdit() {
    if (isSaving) return
    setEditError('')
    setIsEditing(false)
  }

  async function saveProfile() {
    if (isSaving) return
    const updatedName = draftName.trim().replace(/\s+/g, ' ')
    const updatedPhone = draftPhone.trim()
    let problem = ''
    if (!updatedName) problem = 'Full Name cannot be empty.'
    else if (updatedName.length < NAME_MIN_LENGTH) problem = `Full Name must be at least ${NAME_MIN_LENGTH} characters.`
    else if (updatedName.length > NAME_MAX_LENGTH) problem = `Full Name must be at most ${NAME_MAX_LENGTH} characters.`
    else if (updatedPhone.length > PHONE_MAX_LENGTH) problem = `Phone number must be at most ${PHONE_MAX_LENGTH} characters.`
    else if (!PHONE_PATTERN.test(updatedPhone)) problem = 'Phone number may only contain digits, spaces and + ( ) -'
    if (problem) {
      setEditError(problem)
      showToast('Validation Error', problem, true)
      return
    }
    if (updatedName === fullName && updatedPhone === phone) {
      setEditError('')
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    setEditError('')
    try {
      // updateMe also refreshes the session user, so the header and this page re-render with the saved values
      await updateMe({ fullName: updatedName, phone: updatedPhone })
      setIsEditing(false)
      showToast('Profile Updated', 'Your name and phone number have been saved.')
    } catch (err) {
      const message = errorMessage(err, 'Could not save your profile. Please try again.')
      setEditError(message)
      showToast('Update Failed', message, true)
    } finally {
      setIsSaving(false)
    }
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') void saveProfile()
    if (event.key === 'Escape') cancelProfileEdit()
  }

  async function confirmLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      // Revokes the refresh token server-side; the local session is cleared even if that request fails
      await logout()
    } catch {
      // Already signed out locally
    }
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <>
      {/* Notification Toast Container */}
      <ProfileToast toast={toast} />
      {/* MacOS Window Container */}
      <div className="w-full mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/90 flex flex-col flex-1 overflow-hidden relative">
        <ProfileHeader />
        {/* Main Scrollable Body Content */}
        <main className="flex-1 p-5 md:p-6 bg-slate-50/50 overflow-y-auto pb-32 md:pb-32">
          {/* Breadcrumbs & Operations Sub-Header */}
          <div className="mb-5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
              <span className="hover:text-slate-800 cursor-pointer" onClick={() => navigate(ROUTES.dashboard)}>Operations</span>
              <span className="text-slate-400">/</span>
              <span className="hover:text-slate-800 cursor-pointer">Settings</span>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">My Profile</h1>
                  {user && (
                    <span className={isActive ? 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 shadow-sm' : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200 shadow-sm'}>
                      <span className={isActive ? 'w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' : 'w-1.5 h-1.5 rounded-full bg-slate-400'} />
                      {isActive ? 'Active Account' : 'Inactive Account'}
                    </span>
                  )}
                  {roleLabel && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-xs font-semibold">
                      {roleLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
                  Manage your StockSense account information, password, and the session on this device.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                <button className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60" disabled={!user} id="toggleEditFormBtn" onClick={enableProfileEdit} type="button">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={PENCIL_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
          {/* Profile load error (the session copy is still shown when available) */}
          {loadState === 'error' && (
            <div className="mb-5 p-3 px-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs" role="alert">
              <div className="flex items-center gap-2.5 text-rose-800">
                <span className="w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                </span>
                <span>
                  <strong className="font-semibold">Couldn&apos;t refresh your profile:</strong> {loaded?.message}
                  {user ? ' Showing the details saved at sign-in.' : ''}
                </span>
              </div>
              <button className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white text-rose-700 border border-rose-200 hover:bg-rose-100 shadow-sm transition-colors self-start md:self-center" onClick={() => setReloadKey((key) => key + 1)} type="button">
                Retry
              </button>
            </div>
          )}
          {/* Account & Security Banner */}
          <div className="mb-5 p-3 px-4 rounded-xl bg-indigo-50/70 border border-indigo-100/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700">
              <span className="w-6 h-6 rounded-md bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={SHIELD_CHECK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
              </span>
              <span>
                <strong className="font-semibold text-brand-800">Account &amp; Security:</strong> Update your name and phone number, change your password, or log out of this device.
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
              {loadState === 'loading' ? (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white text-slate-500 border border-indigo-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                  Syncing Profile...
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Session Active
                </span>
              )}
              <button className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition-colors flex items-center gap-1" onClick={() => setIsPasswordOpen(true)} type="button">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={LOCK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                Change Password
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
                  <span className={isActive ? 'w-2 h-2 rounded-full bg-emerald-500' : 'w-2 h-2 rounded-full bg-slate-400'} />
                  {user ? (isActive ? 'Active' : 'Inactive') : '—'}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  {user ? `Member since ${formatDate(user.createdAt)}` : 'Loading account...'}
                </div>
              </div>
            </div>
            {/* KPI 2 */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Role</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={SHIELD_CHECK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                </div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-emerald-600 tracking-tight">{user ? (user.role === 'INVENTORY_MANAGER' ? 'Manager' : 'Staff') : '—'}</div>
                <div className="text-xs text-slate-500 mt-1">{roleLabel || 'Loading role...'}</div>
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
                <div className="text-xs text-slate-500 mt-1">Email &amp; password sign-in</div>
              </div>
            </div>
            {/* KPI 4: Highlighted Primary Card with Indigo Accent Border */}
            <div className="bg-gradient-to-b from-indigo-50/50 to-white rounded-xl p-4 border-2 border-brand-600 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700">This Device</span>
                <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-pulse" />
                  Active Session
                </span>
              </div>
              <div>
                <div className="text-xl font-bold font-mono text-brand-600 truncate" title={device.label}>{device.browser}</div>
                <div className="text-xs text-brand-800/70 font-medium mt-1">{device.os ? `${device.os} · Current browser` : 'Current browser'}</div>
              </div>
            </div>
            {/* KPI 5 */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Last Sign-in</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={CLOCK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                </div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-emerald-600 tracking-tight">{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                <div className="text-xs text-slate-500 mt-1">{user?.lastLoginAt ? formatDate(user.lastLoginAt) : 'No sign-in recorded'}</div>
              </div>
            </div>
          </div>
          {/* Main Workspace Split: Left Main Details + Right Session Panel */}
          <div className="flex flex-col xl:flex-row gap-5 items-start">
            {/* Left: Profile Details Container */}
            <div className="w-full flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {/* Table Header Style */}
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-brand-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={USER_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Profile Details</h2>
                    <p className="text-xs text-slate-500">Your account identity, contact details and sign-in credentials.</p>
                  </div>
                </div>
                {user && (
                  <div className="flex items-center flex-wrap gap-3">
                    <span className={isActive ? 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200' : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200'}>
                      <span className={isActive ? 'w-1.5 h-1.5 rounded-full bg-emerald-500' : 'w-1.5 h-1.5 rounded-full bg-slate-400'} />
                      {isActive ? 'ACCOUNT ACTIVE' : 'ACCOUNT INACTIVE'}
                    </span>
                  </div>
                )}
              </div>
              {/* User Identity Banner Block */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/40 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-700 to-indigo-500 text-white font-bold text-2xl flex items-center justify-center shadow-md">
                      {user ? initialsOf(fullName) : ''}
                    </div>
                    {isActive && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white" title="Active account">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={CHECK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /></svg>
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 truncate" id="displayProfileNameHeader">{user ? fullName : 'Loading profile...'}</h3>
                      {roleLabel && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200 shrink-0">{roleLabel}</span>}
                    </div>
                    <div className="text-xs font-mono text-slate-500 mt-0.5 truncate">{user?.email ?? '—'}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{user ? `${roleLabel} · Member since ${formatDate(user.createdAt)}` : ''}</div>
                  </div>
                </div>
                <button className="self-start sm:self-center px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-60" disabled={!user} id="quickEditBtn" onClick={enableProfileEdit} type="button">
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
                        <input className={`flex-1 min-w-0 text-sm font-medium text-slate-900 ${EDIT_INPUT}`} disabled={isSaving} id="inputFullName" maxLength={NAME_MAX_LENGTH} onChange={(e) => setDraftName(e.target.value)} onKeyDown={handleEditKeyDown} ref={nameInputRef} type="text" value={draftName} />
                      ) : (
                        <span>{user ? fullName : '—'}</span>
                      )}
                    </div>
                  </div>
                  {/* Field 2 */}
                  <div className={FIELD_CARD}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Work Email</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={LOCK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                        Cannot be changed
                      </span>
                    </div>
                    <div className="font-mono text-slate-700 text-xs break-all">{user?.email ?? '—'}</div>
                  </div>
                  {/* Field 3 */}
                  <div className={FIELD_CARD}>
                    <span className={FIELD_LABEL}>Role</span>
                    <div className="font-mono font-medium text-slate-900 text-xs flex items-center justify-between">
                      <span>{roleLabel || '—'}</span>
                      {user && (
                        <span className={isActive ? 'px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold' : 'px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold'}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Field 4 */}
                  <div className={FIELD_CARD}>
                    <span className={FIELD_LABEL}>Last Sign-in</span>
                    <div className="font-medium text-brand-700 text-xs flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-brand-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={MONITOR_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                      <span>{user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'No sign-in recorded'}</span>
                    </div>
                  </div>
                  {/* Field 5 */}
                  <div className={FIELD_CARD}>
                    <span className={FIELD_LABEL}>Direct Contact</span>
                    <div className="font-mono font-medium text-slate-800 text-xs">
                      {isEditing ? (
                        <input className={`w-full font-mono text-xs font-medium text-slate-800 ${EDIT_INPUT}`} disabled={isSaving} id="inputPhone" maxLength={PHONE_MAX_LENGTH} onChange={(e) => setDraftPhone(e.target.value)} onKeyDown={handleEditKeyDown} placeholder="Add a phone number" type="tel" value={draftPhone} />
                      ) : phone ? (
                        phone
                      ) : (
                        <span className="font-sans font-normal text-slate-400">{user ? 'Not added' : '—'}</span>
                      )}
                    </div>
                  </div>
                  {/* Field 6 */}
                  <div className={FIELD_CARD}>
                    <span className={FIELD_LABEL}>Member Since</span>
                    <div className="font-medium text-slate-800 text-xs flex items-center justify-between">
                      <span>{user ? `${formatDate(user.createdAt)}${tenure ? ` (${tenure})` : ''}` : '—'}</span>
                    </div>
                  </div>
                </div>
                {/* Profile edit actions (shown while editing) */}
                {isEditing && (
                  <div className="flex items-center justify-end gap-2" id="profileEditActions">
                    {editError && <p className="mr-auto text-xs text-rose-600 font-medium" role="alert">{editError}</p>}
                    <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-60" disabled={isSaving} id="cancelEditProfileBtn" onClick={cancelProfileEdit} type="button">
                      Cancel
                    </button>
                    <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors disabled:opacity-60" disabled={isSaving} onClick={() => void saveProfile()} type="button">
                      {isSaving ? 'Saving...' : 'Save Changes'}
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
                        <span className="font-semibold text-slate-900">Password</span>
                        <span className="font-mono text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">{`Min. ${PASSWORD_MIN_LENGTH} characters`}</span>
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
                  onChanged={() => showToast('Password Changed', 'Your password has been updated. Use it the next time you sign in.')}
                  onClose={() => setIsPasswordOpen(false)}
                />
              </div>
              {/* Table Footer Style */}
              <div className="p-3.5 px-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs mt-auto">
                <div className="flex items-center gap-2 text-slate-500">
                  <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={SHIELD_CHECK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                  <span>Your email address is your sign-in ID and can&apos;t be changed here.</span>
                </div>
              </div>
            </div>
            {/* Right Panel: session on this device */}
            <SessionDrawer onLogout={() => setIsLogoutOpen(true)} user={user} />
          </div>
        </main>
        {/* Bottom Status Bar */}
      </div>
      <LogoutModal isLoggingOut={isLoggingOut} isOpen={isLogoutOpen} onCancel={() => setIsLogoutOpen(false)} onConfirm={() => void confirmLogout()} />
    </>
  )
}
