import { CHECK_PATH, LOCK_PATH, LOGOUT_PATH, MONITOR_PATH, SESSION_ATTRIBUTES, USER_PATH } from './data.ts'

// Right verification panel for the active session #SS-9821
export function SessionDrawer({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="w-full xl:w-[440px] bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 flex flex-col gap-4 shrink-0 transition-all duration-300" id="sessionDrawer">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={MONITOR_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            <h3 className="text-base font-mono font-bold text-slate-900">#SS-9821 (Active Session)</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
              Verified Active
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Primary Gateway · Bhiwandi Node #8839</div>
        </div>
        <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Close Panel" type="button">
          <span className="text-base leading-none">×</span>
        </button>
      </div>
      {/* Operational Status Box */}
      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={CHECK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
        </div>
        <div>
          <div className="text-xs font-bold text-emerald-900">Session Operational</div>
          <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
            256-bit AES GCM Encrypted. Gateway node signed by Core Vault.
          </p>
        </div>
      </div>
      {/* Session Attributes & Parameters Section */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Session Attributes &amp; Parameters</span>
          <span className="text-[10px] font-mono text-brand-600 font-semibold">SS-9821</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
          {SESSION_ATTRIBUTES.map((attr) => (
            <div className={attr.rowClassName} key={attr.title}>
              <div className="flex items-start gap-2">
                <div className={attr.iconBoxClassName}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={attr.iconPath} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">{attr.title}</div>
                  <div className="text-[11px] font-mono text-slate-500">{attr.value}</div>
                  <div className={attr.statusClassName}>
                    <span className={attr.dotClassName} />
                    {attr.status}
                  </div>
                </div>
              </div>
              <span className={attr.badgeClassName}>{attr.badge}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Details & Telemetry Section */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Session Metadata &amp; Parameters</span>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Session User</span>
            <span className="font-medium text-slate-900 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={USER_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
              Manish (Inventory Admin)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Primary Facility</span>
            <span className="font-medium text-slate-900 text-right truncate max-w-[220px]">Main Warehouse (West Hub)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Cryptographic Token</span>
            <span className="font-mono text-brand-600 underline cursor-pointer" title="0x7f9a12e8b03e44917a2e58c94982a1df82910">0x7f9a12e8b03e...</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Immutability Status</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={LOCK_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
              Strict Read-Only Ledger
            </span>
          </div>
        </div>
      </div>
      {/* Drawer Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button className="flex-1 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" type="button">
          Close
        </button>
        <button className="flex-1 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm" id="openLogoutModalBtn" onClick={onLogout} type="button">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d={LOGOUT_PATH} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
          <span>Log Out of StockSense</span>
        </button>
      </div>
    </div>
  )
}
