import { HUB_LOCATIONS } from './data.ts'

const DRAWER = 'w-full xl:w-[440px] bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 flex flex-col gap-4 shrink-0 transition-all duration-300'

type InspectorDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

// Right slide-over / verification panel (#WH-001)
export function InspectorDrawer({ isOpen, onClose }: InspectorDrawerProps) {
  return (
    <div className={isOpen ? DRAWER : `${DRAWER} hidden`} id="inspectorDrawer">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-indigo-600">warehouse</span>
            <h3 className="text-base font-mono font-bold text-slate-900">#WH-001 (Main Warehouse)</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
              Verified Active
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Regional Inbound &amp; Dispatch Hub · Bhiwandi Node #8839</div>
        </div>
        <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={onClose} title="Close Panel">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      {/* Operational Status Box */}
      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[15px]">check</span>
        </div>
        <div>
          <div className="text-xs font-bold text-emerald-900">Facility Operational</div>
          <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
            7 Internal Locations active. Capacity index at 68%. Hash signed by Core Vault.
          </p>
        </div>
      </div>
      {/* Locations Breakdown Section */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Locations Breakdown (7)</span>
          <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5" type="button">
            <span className="material-symbols-outlined text-[13px]">add</span>
            Add Sub-Location
          </button>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
          {HUB_LOCATIONS.map((location) => (
            <div className={location.rowClassName} key={location.code}>
              <div className="flex items-start gap-2">
                <div className={location.iconBoxClassName}>
                  <span className="material-symbols-outlined text-[16px]">{location.icon}</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">{location.name}</div>
                  <div className="text-[11px] font-mono text-slate-500">{location.code}</div>
                  <div className={location.statusClassName}>
                    <span className={location.dotClassName} />
                    {location.status}
                  </div>
                </div>
              </div>
              <span className={location.badgeClassName}>{location.skus}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Details & Telemetry Section */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Warehouse Metadata &amp; Parameters</span>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Warehouse Manager</span>
            <span className="font-medium text-slate-900 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-indigo-600">person</span>
              Manish (Inventory Admin)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Geo Address</span>
            <span className="font-medium text-slate-900 text-right truncate max-w-[220px]">Survey 142, Bhiwandi, MH</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Floor Capacity</span>
            <span className="font-mono font-medium text-slate-900">12,000 SQFT (68% utilized)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Cryptographic ID</span>
            <span className="font-mono text-indigo-600 underline cursor-pointer" title="0x7f9a12e8b03e44917a2e58c94982a1df82910">0x7f9a12e8b03e...</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Immutability Status</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
              <span className="material-symbols-outlined text-[13px] text-emerald-600">lock</span>
              Strict Read-Only Ledger
            </span>
          </div>
        </div>
      </div>
      {/* Drawer Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button className="flex-1 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" onClick={onClose} type="button">
          Close
        </button>
        <button className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm" type="button">
          <span className="material-symbols-outlined text-[14px]">add</span>
          <span>Add Location to Hub</span>
        </button>
      </div>
    </div>
  )
}
