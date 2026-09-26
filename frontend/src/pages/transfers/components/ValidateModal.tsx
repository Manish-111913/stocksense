import { type ValidateTarget } from '../data.ts'

const MODAL_OPEN = 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4'
const MODAL_CLOSED = 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs hidden flex items-center justify-center p-4'

interface ValidateModalProps {
  open: boolean
  target: ValidateTarget
  onClose: () => void
  onConfirm: () => void
}

// Atomic validation confirmation dialog
export function ValidateModal({ open, target, onClose, onConfirm }: ValidateModalProps) {
  return (
    <div className={open ? MODAL_OPEN : MODAL_CLOSED} id="validateModal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Validation Modal Header */}
        <div className="p-6 pb-3 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">verified</span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm text-slate-900">Validate Internal Transfer?</h3>
            <p className="text-[11px] text-slate-500 mt-0.5" id="valRefTitle">
              Reference: {target.ref} · Atomic Ledger Execution
            </p>
          </div>
          <button className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700" onClick={onClose} type="button">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        {/* Validation Details & Flow */}
        <div className="p-6 pt-2 flex flex-col gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Atomic Stock Shift</span>
              <span className="font-mono text-emerald-700 font-semibold">Zero Net Delta</span>
            </div>
            <div className="text-[11px] text-slate-700 leading-relaxed font-sans" id="valDescription">
              Validating this transfer will atomically deduct <span className="font-semibold text-rose-600">{target.qty}</span> of {target.product} from{' '}
              <span className="font-semibold text-slate-900">{`${target.srcWh} (${target.srcLoc})`}</span> and credit <span className="font-semibold text-emerald-700">{target.qty}</span> to{' '}
              <span className="font-semibold text-slate-900">{`${target.dstWh} (${target.dstLoc})`}</span>. Total company stock remains unchanged.
            </div>
          </div>
          {/* Safeguards Checklist */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Validation Safeguards</span>
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
                Source Stock Reservation Verified
              </span>
              <span className="font-mono font-semibold">500 KG OK</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-indigo-600">sync</span>
                Destination Berth Capacity
              </span>
              <span className="font-mono font-semibold text-indigo-600">Unrestricted</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-slate-400">tag</span>
                Cryptographic Ledger Sequence
              </span>
              <span className="font-mono text-slate-500">TX-SEQ #44192</span>
            </div>
          </div>
        </div>
        {/* Validation Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
          <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-[0.98] transition-all" onClick={onConfirm} type="button">
            <span className="material-symbols-outlined text-[15px]">verified</span>
            <span>Validate Transfer</span>
          </button>
        </div>
      </div>
    </div>
  )
}
