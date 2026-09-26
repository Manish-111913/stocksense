import type { DocumentStatus } from '../../../api/types.ts'

/** The status-driven primary action (Save Draft / Confirm / Mark as Arrived / Validate) */
export interface ReceiptPrimaryAction {
  label: string
  busyLabel: string
  icon: string
  onClick: () => void
}

interface ReceiptSummaryCardProps {
  status: DocumentStatus
  productCount: number
  totalQty: string
  /** Checklist values; null while not chosen yet */
  supplierLabel: string | null
  destinationLabel: string | null
  /** "N Items > 0" check; `isValid` false when a line lacks a strictly positive quantity */
  qtyCheck: { text: string; isValid: boolean }
  primaryAction: ReceiptPrimaryAction | null
  isBusy: boolean
  /** Shows the primary action's busy label */
  isPrimaryBusy: boolean
  hint: string
}

const CHECK_OK = 'material-symbols-outlined text-[15px] text-emerald-600'
const CHECK_TODO = 'material-symbols-outlined text-[15px] text-slate-300'

// Right column: receipt summary, real-time calculations and ledger impact
export function ReceiptSummaryCard({ status, productCount, totalQty, supplierLabel, destinationLabel, qtyCheck, primaryAction, isBusy, isPrimaryBusy, hint }: ReceiptSummaryCardProps) {
  const phase = status === 'DONE' ? 'Posted' : status === 'CANCELED' ? 'Canceled' : 'Pre-Validation'

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
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">{phase}</span>
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
              <strong className="font-semibold text-blue-950">Stock Movement Note:</strong> Validating this receipt will atomically increase inventory balances at the receiving location and append entries to the immutable Stock Ledger.
            </p>
          </div>
          {/* Pre-Flight Verification Checklist */}
          <div className="space-y-2.5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Pre-Flight Validation Checklist</span>
            <div className="space-y-1.5 text-xs">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-700 flex-shrink-0">
                  <span className={supplierLabel ? CHECK_OK : CHECK_TODO}>{supplierLabel ? 'check_circle' : 'radio_button_unchecked'}</span> Supplier selected
                </span>
                <span className={supplierLabel ? 'font-medium text-slate-900 text-[11px] truncate' : 'font-medium text-rose-600 text-[11px]'}>{supplierLabel ?? 'Not selected'}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-700 flex-shrink-0">
                  <span className={destinationLabel ? CHECK_OK : CHECK_TODO}>{destinationLabel ? 'check_circle' : 'radio_button_unchecked'}</span> Warehouse destination ready
                </span>
                <span className={destinationLabel ? 'font-medium text-slate-900 text-[11px] truncate' : 'font-medium text-rose-600 text-[11px]'}>{destinationLabel ?? 'Not selected'}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-700 flex-shrink-0">
                  <span className={qtyCheck.isValid ? CHECK_OK : CHECK_TODO}>{qtyCheck.isValid ? 'check_circle' : 'radio_button_unchecked'}</span> Line item quantities verified
                </span>
                <span className={qtyCheck.isValid ? 'font-medium text-emerald-700 font-mono text-[11px]' : 'font-medium text-rose-600 font-mono text-[11px]'} id="summaryCheckQty">
                  {qtyCheck.text}
                </span>
              </div>
            </div>
          </div>
          {/* Large Primary Action Button */}
          <div className="pt-3">
            {primaryAction && (
              <button
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
                disabled={isBusy}
                id="btnValidateReceiptPrimary"
                onClick={primaryAction.onClick}
                type="button"
              >
                <span className={isPrimaryBusy ? 'material-symbols-outlined text-[18px] animate-spin' : 'material-symbols-outlined text-[18px]'}>{isPrimaryBusy ? 'progress_activity' : primaryAction.icon}</span>
                <span>{isPrimaryBusy ? primaryAction.busyLabel : primaryAction.label}</span>
              </button>
            )}
            <p className="text-[10px] text-slate-400 text-center mt-2">{hint}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
