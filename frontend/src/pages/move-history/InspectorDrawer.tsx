import { type MouseEvent } from 'react'

interface InspectorDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const DRAWER = 'w-full xl:w-[440px] bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 flex flex-col gap-4 shrink-0 transition-all duration-300'

function preventDefault(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
}

// Right slide-over / verification panel (WH/INT/00142)
export function InspectorDrawer({ isOpen, onClose }: InspectorDrawerProps) {
  return (
    <div className={isOpen ? DRAWER : `${DRAWER} hidden`} id="inspectorDrawer">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-indigo-600">receipt_long</span>
            <h3 className="text-base font-mono font-bold text-slate-900">#LG-2026-099214</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
              Verified
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Internal Ledger Reference · Ledger Chain #4199</div>
        </div>
        <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={onClose} title="Close Panel">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      {/* Current Audit State */}
      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[15px]">check</span>
        </div>
        <div>
          <div className="text-xs font-bold text-emerald-900">Committed to Ledger</div>
          <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
            Movement verified and permanently written to stock ledger. Hashes signed by Bengaluru Core Vault.
          </p>
        </div>
      </div>
      {/* Movement Flow Path Visual Diagram */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Movement Flow Path</span>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
          {/* Source */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                <span className="material-symbols-outlined text-[16px]">warehouse</span>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900">Main Warehouse (West)</div>
                <div className="text-[11px] font-mono text-indigo-600">Source: Stock Bay 04-A</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-mono text-xs font-semibold">-150.00 KG</span>
          </div>
          {/* Transit Indicator */}
          <div className="flex items-center justify-center relative py-1">
            <div className="w-full h-px bg-slate-200" />
            <div className="absolute px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-semibold flex items-center gap-1 shadow-2xs">
              <span className="material-symbols-outlined text-[13px]">local_shipping</span>
              Transit via Dispatch Bay 01
            </div>
          </div>
          {/* Destination */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                <span className="material-symbols-outlined text-[16px]">domain</span>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900">East Depot Facility</div>
                <div className="text-[11px] font-mono text-emerald-600">Destination: Dock Bay 01</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-mono text-xs font-semibold">+150.00 KG</span>
          </div>
        </div>
      </div>
      {/* Items & Quantity Delta */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Items &amp; Quantity Delta</span>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Steel Rod 20mm</span>
            <span className="text-sm font-mono font-bold text-slate-900">150.00 KG</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            SKU: STL-001 · Bar No. 8839 · <span className="text-indigo-600 font-semibold">Impact: Internal Shift (-150 / +150)</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>Unit Valuation: ₹ 54.20 / KG</span>
            <span className="font-mono font-semibold text-slate-900">Total Lot: ₹ 8,130.00</span>
          </div>
        </div>
      </div>
      {/* Stock Ledger Hash & Audit Log Meta */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock Ledger Hash &amp; Audit Log</span>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Ledger Type</span>
            <span className="font-medium text-slate-900">Atomic Internal Shift</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Operator</span>
            <span className="font-medium text-slate-900 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-indigo-600">person</span>
              Manish (Inventory Admin)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Block / TX Hash</span>
            <span className="font-mono text-indigo-600 underline cursor-pointer" title="0x7f9a12c8b03e44917a2e58c94982a1df82910">0x7f9a12c8b03e...</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Source Document</span>
            <a className="font-mono font-semibold text-indigo-600 hover:underline" href="#" onClick={preventDefault}>WH/INT/00142</a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Net Financial Delta</span>
            <span className="font-mono font-semibold text-emerald-600">₹ 0.00 (Zero Effect)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Immutability Status</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-medium">
              <span className="material-symbols-outlined text-[13px] text-slate-400">lock</span>
              Read-Only Locked
            </span>
          </div>
        </div>
      </div>
      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button className="flex-1 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" onClick={onClose} type="button">
          Close
        </button>
        <button className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm" type="button">
          <span>View Related Document</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}
