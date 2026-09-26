import { ROLE_LABEL, type UserProfile } from '../../api/types.ts'
import { CHECK_PATH, CLOCK_PATH, describeThisDevice, formatDate, formatDateTime, LOCK_PATH, LOGOUT_PATH, MONITOR_PATH, USER_PATH } from './data.ts'

const ATTR_ROW_DIVIDED = 'flex items-center justify-between pb-2.5 border-b border-slate-200/70'
const ATTR_ROW = 'flex items-center justify-between'
const ATTR_STATUS = 'text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1'
const ATTR_DOT = 'w-1.5 h-1.5 rounded-full bg-emerald-500'
const ATTR_ICON_BOX = 'w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm'
const ATTR_BADGE = 'px-2 py-0.5 rounded font-mono font-semibold text-xs shrink-0'

type SessionDrawerProps = {
  user: UserProfile | null
  onLogout: () => void
}

// Right panel for the current sign-in on this browser (the API exposes no list of other sessions / devices)
export function SessionDrawer({ user, onLogout }: SessionDrawerProps) {
  const device = describeThisDevice()
  const attributes = [
    {
      title: 'Client Environment',
      value: device.label,
      status: 'Active · This browser',
      iconClassName: 'text-brand-600',
      iconPath: MONITOR_PATH,
      badge: 'Current',
      badgeClassName: 'bg-brand-100 text-brand-800',
    },
    {
      title: 'Sign-in Method',
      value: 'Email & password',
      status: user?.lastLoginAt ? `Last sign-in ${formatDateTime(user.lastLoginAt)}` : 'No sign-in recorded yet',
      iconClassName: 'text-indigo-700',
      iconPath: LOCK_PATH,
      badge: 'Password',
      badgeClassName: 'bg-indigo-100 text-brand-800',
    },
  ]

  return (
    <div className="w-full xl:w-[440px] bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 flex flex-col gap-4 shrink-0 transition-all duration-300" id="sessionDrawer">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={MONITOR_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            <h3 className="text-base font-mono font-bold text-slate-900">This Device</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
              Signed In
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{device.label}</div>
        </div>
      </div>
      {/* Operational Status Box */}
      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={CHECK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
        </div>
        <div>
          <div className="text-xs font-bold text-emerald-900">Session Active</div>
          <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
            You stay signed in on this browser until you log out. Logging out ends this session only.
          </p>
        </div>
      </div>
      {/* Session Attributes Section */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Session Attributes</span>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
          {attributes.map((attr, index) => (
            <div className={index < attributes.length - 1 ? ATTR_ROW_DIVIDED : ATTR_ROW} key={attr.title}>
              <div className="flex items-start gap-2">
                <div className={`${ATTR_ICON_BOX} ${attr.iconClassName}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={attr.iconPath} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">{attr.title}</div>
                  <div className="text-[11px] font-mono text-slate-500">{attr.value}</div>
                  <div className={ATTR_STATUS}>
                    <span className={ATTR_DOT} />
                    {attr.status}
                  </div>
                </div>
              </div>
              <span className={`${ATTR_BADGE} ${attr.badgeClassName}`}>{attr.badge}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Account Details Section */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Signed-in Account</span>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 shrink-0">Session User</span>
            <span className="font-medium text-slate-900 flex items-center gap-1 min-w-0">
              <svg className="w-3.5 h-3.5 text-brand-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={USER_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
              <span className="truncate">{user ? `${user.fullName} (${ROLE_LABEL[user.role]})` : '—'}</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 shrink-0">Email</span>
            <span className="font-mono text-slate-900 text-right truncate max-w-[260px]" title={user?.email}>{user?.email ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 shrink-0">Member Since</span>
            <span className="font-medium text-slate-900">{formatDate(user?.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 shrink-0">Last Sign-in</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-medium">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={CLOCK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
              {formatDateTime(user?.lastLoginAt)}
            </span>
          </div>
        </div>
      </div>
      {/* Drawer Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button className="flex-1 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm" id="openLogoutModalBtn" onClick={onLogout} type="button">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={LOGOUT_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
          <span>Log Out of This Device</span>
        </button>
      </div>
    </div>
  )
}
