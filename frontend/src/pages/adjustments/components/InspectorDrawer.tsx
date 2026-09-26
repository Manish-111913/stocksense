const PANEL_CLASS = 'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 flex flex-col'
const PANEL_CLOSED_CLASS = 'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 transform translate-x-full transition-transform duration-300 flex flex-col'

interface InspectorDrawerProps {
  isOpen: boolean
  panelRef: string
  onClose: () => void
  onValidate: () => void
}

// Slide-over detail drawer (stays mounted so it can slide in and out)
export function InspectorDrawer({ isOpen, panelRef, onClose, onValidate }: InspectorDrawerProps) {
  return (
    <div className={isOpen ? PANEL_CLASS : PANEL_CLOSED_CLASS} id="detailPanel">
      <div className="p-5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-indigo-600">receipt_long</span>
          <span className="font-bold text-sm text-slate-900" id="panelRef">{panelRef}</span>
          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">Verified</span>
        </div>
        <button className="w-8 h-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors" onClick={onClose} type="button">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 text-xs">
        {/* Status Banner */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-900">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Current State</div>
            <div className="text-base font-bold text-emerald-950 mt-0.5">Ready for Validation</div>
            <p className="text-[11px] text-emerald-800 mt-0.5">All line items verified and staged at origin dock.</p>
          </div>
          <span className="material-symbols-outlined text-3xl text-emerald-600">task_alt</span>
        </div>
        {/* Movement Route Card */}
        <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Movement Path</span>
          <div className="flex items-center justify-between text-xs pt-1">
            <div>
              <div className="font-semibold text-slate-900">Main Warehouse (West)</div>
              <div className="text-slate-500 font-mono text-[11px]">Stock Bay 04-A</div>
            </div>
            <span className="material-symbols-outlined text-indigo-600 text-lg">arrow_right_alt</span>
            <div className="text-right">
              <div className="font-semibold text-slate-900">East Depot</div>
              <div className="text-slate-500 font-mono text-[11px]">Receiving Dock Bay 01</div>
            </div>
          </div>
        </div>
        {/* SKU Manifest */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Items Manifest</span>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900">Steel Rod 20mm</div>
              <div className="font-mono text-[11px] text-slate-500">SKU: STL-001 · Bar No. 8839</div>
            </div>
            <div className="text-right font-mono">
              <div className="font-bold text-slate-900 text-sm">150.00 KG</div>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/50">Allocated</span>
            </div>
          </div>
        </div>
        {/* Cryptographic Stock Ledger Hash & Audit Log */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stock Ledger Hash &amp; Audit Log</span>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 font-mono text-[11px] flex flex-col gap-2 text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Ledger Type:</span>
              <span className="font-semibold text-slate-800">Atomic Internal Shift</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Operator:</span>
              <span className="text-slate-800">Manish (Inventory Admin)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Hash:</span>
              <span className="text-indigo-600 truncate max-w-[180px]" title="0x7f9a12c8b03e44917a2">0x7f9a12c8b03e44917a2...</span>
            </div>
            <div className="flex justify-between border-t border-slate-200/60 pt-2">
              <span className="text-slate-400">Net Financial Delta:</span>
              <span className="text-slate-900 font-bold">₹ 0.00 (Zero Effect)</span>
            </div>
          </div>
        </div>
      </div>
      {/* Drawer Footer Actions */}
      <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2.5">
        <button className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors text-center" onClick={onClose} type="button">
          Close
        </button>
        <button className="flex-1 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs transition-all text-center flex items-center justify-center gap-1.5" onClick={onValidate} type="button">
          <span className="material-symbols-outlined text-[15px]">check</span>
          <span>Validate Transfer</span>
        </button>
      </div>
    </div>
  )
}
