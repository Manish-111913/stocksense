interface ReceiptSummaryCardProps {
  productCount: number
  totalQty: number
  /** "N Items > 0" check; `isValid` false when a line lacks a strictly positive quantity */
  qtyCheck: { text: string; isValid: boolean }
  warehouseLabel: string
  onValidate: () => void
}

// Right column: receipt summary, real-time calculations and ledger impact
export function ReceiptSummaryCard({ productCount, totalQty, qtyCheck, warehouseLabel, onValidate }: ReceiptSummaryCardProps) {
  return (
    <div className="lg:col-span-5 space-y-6">
      {/* Receipt Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[17px]">analytics</span>
            </span>
            <h2 className="text-sm font-bold text-slate-900">Receipt Summary</h2>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">Pre-Validation</span>
        </div>
        <div className="p-5 space-y-5">
          {/* Highlight Metric 1: Products Count */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Unique Line Items</span>
              <div className="text-2xl font-bold font-mono text-slate-900" id="summaryProductCount">{productCount}</div>
              <span className="text-[10px] text-slate-400">Registered SKUs</span>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">Total Received Units</span>
              <div className="text-2xl font-bold font-mono text-emerald-900" id="summaryTotalQty">{totalQty}</div>
              <span className="text-[10px] text-emerald-700 font-medium">Combined movement</span>
            </div>
          </div>
          {/* Stock Movement Note */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100/90 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-blue-600 text-[18px] flex-shrink-0 mt-0.5">shield</span>
            <p className="text-xs text-blue-900 leading-relaxed">
              <strong className="font-semibold text-blue-950">Stock Movement Note:</strong> Validating this receipt will atomically increase inventory balances at the receiving location and append cryptographically verified entries to the immutable Stock Ledger.
            </p>
          </div>
          {/* Pre-Flight Verification Checklist */}
          <div className="space-y-2.5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Pre-Flight Validation Checklist</span>
            <div className="space-y-1.5 text-xs">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span> Supplier verified
                </span>
                <span className="font-medium text-slate-900 text-[11px]">Apex Industrial</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span> Warehouse destination ready
                </span>
                <span className="font-medium text-slate-900 text-[11px]">{warehouseLabel}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span> Line item quantities verified
                </span>
                <span className={qtyCheck.isValid ? 'font-medium text-emerald-700 font-mono text-[11px]' : 'font-medium text-rose-600 font-mono text-[11px]'} id="summaryCheckQty">
                  {qtyCheck.text}
                </span>
              </div>
            </div>
          </div>
          {/* Large Primary Action Button */}
          <div className="pt-3">
            <button
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              id="btnValidateReceiptPrimary"
              onClick={onValidate}
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Validate &amp; Ingest Receipt</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-2">Immutable commit: updates product balances &amp; ledger timestamps instantly.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
