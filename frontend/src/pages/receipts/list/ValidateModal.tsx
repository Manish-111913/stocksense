import type { Receipt } from '../../../api/types.ts'
import { linesLabel, receiptQuantityLabel } from './receiptsData.ts'

interface ValidateModalProps {
  receipt: Receipt
  isPosting: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => void
}

// Quick validate modal: READY → DONE posts every line to the stock ledger
export function ValidateModal({ receipt, isPosting, error, onClose, onConfirm }: ValidateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" id="validateModal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-scale-in">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">verified</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Validate Inbound Receipt</h3>
              <span className="font-mono text-[11px] text-indigo-600 font-bold" id="modalReceiptRef">{receipt.reference}</span>
            </div>
          </div>
          <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" disabled={isPosting} onClick={onClose}>
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="space-y-3.5">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Vendor:</span>
              <span className="font-semibold text-slate-800" id="modalSupplier">{receipt.supplier.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Verified Quantity:</span>
              <span className="font-mono font-bold text-slate-900" id="modalQty">{`${receiptQuantityLabel(receipt)} (${linesLabel(receipt.lineCount)})`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Destination Berth:</span>
              <span className="font-medium text-slate-800" id="modalLocation">{`${receipt.warehouse.name} / ${receipt.location.name}`}</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100/90 text-blue-900 text-xs flex items-start gap-2.5">
            <span className="material-symbols-outlined text-blue-600 text-[18px] flex-shrink-0 mt-0.5">shield</span>
            <p className="leading-relaxed">
              Validation commits this receipt permanently to the <strong>Stock Ledger</strong>. Inventory levels will immediately increase, and this action cannot be undone.
            </p>
          </div>
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}
        </div>
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors" disabled={isPosting} onClick={onClose}>
            Cancel
          </button>
          <button className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-60" disabled={isPosting} id="btnConfirmValidation" onClick={onConfirm}>
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span id="confirmValLabel">{isPosting ? 'Posting to Ledger...' : 'Confirm & Post to Ledger'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
