import { RECEIPT_REF } from './data.ts'

interface ReceiptValidationModalProps {
  warehouseLabel: string
  ingestSummary: string
  onCancel: () => void
  onConfirm: () => void
}

// Interactive validation confirmation modal dialog
export function ReceiptValidationModal({ warehouseLabel, ingestSummary, onCancel, onConfirm }: ReceiptValidationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" id="receiptValidationModal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4 animate-scale-in">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1">
          <span className="material-symbols-outlined text-2xl">verified</span>
        </div>
        <h3 className="text-base font-bold text-slate-900">Validate Receipt?</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Validating this receipt will add the received quantities to inventory balances across specified warehouse locations and record an immutable Stock Ledger receipt entry. <strong>This action cannot be undone.</strong>
        </p>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Reference:</span>
            <span className="font-mono font-bold text-slate-800">{RECEIPT_REF}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Receiving Node:</span>
            <span className="font-semibold text-slate-800">{warehouseLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Items to Ingest:</span>
            <span className="font-mono font-bold text-emerald-700" id="modalIngestItemsCount">{ingestSummary}</span>
          </div>
        </div>
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-[0.98] transition-all" id="btnConfirmValidation" onClick={onConfirm} type="button">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Confirm &amp; Validate Receipt</span>
          </button>
        </div>
      </div>
    </div>
  )
}
