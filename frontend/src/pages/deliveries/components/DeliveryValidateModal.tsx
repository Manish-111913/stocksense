import { type ValidateTarget } from '../data.ts'

interface DeliveryValidateModalProps {
  target: ValidateTarget
  isPosting: boolean
  onClose: () => void
  onConfirm: () => void
}

// Validate delivery order modal (atomic ledger deduction)
export function DeliveryValidateModal({ target, isPosting, onClose, onConfirm }: DeliveryValidateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" id="deliveryValidateModal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-scale-in">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">local_shipping</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Validate Delivery Order</h3>
              <span className="font-mono text-[11px] text-indigo-600 font-bold" id="modalDeliveryRef">{target.ref}</span>
            </div>
          </div>
          <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="space-y-3.5">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Customer / Entity:</span>
              <span className="font-semibold text-slate-800" id="modalDeliveryCustomer">{target.customer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Items Decrement:</span>
              <span className="font-mono font-bold text-rose-600" id="modalDeliveryQty">{target.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Source Berth:</span>
              <span className="font-medium text-slate-800" id="modalDeliveryLocation">{`${target.location} (${target.warehouse})`}</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100 text-rose-900 text-xs flex items-start gap-2.5">
            <span className="material-symbols-outlined text-rose-600 text-[18px] flex-shrink-0 mt-0.5">shield</span>
            <p className="leading-relaxed">
              Validating this delivery will <strong>atomically deduct</strong> inventory counts from Main Warehouse West and post irreversible entries to the <strong>Stock Ledger</strong>.
            </p>
          </div>
        </div>
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors" onClick={onClose}>
            Cancel
          </button>
          <button className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-[0.98] transition-all" disabled={isPosting} id="btnConfirmDeliveryValidation" onClick={onConfirm}>
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span id="btnConfirmDeliveryLabel">{isPosting ? 'Posting to Stock Ledger...' : 'Confirm & Post to Ledger'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
