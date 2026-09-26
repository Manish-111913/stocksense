import type { Adjustment } from '../../../api/types.ts'
import { formatQty } from '../../products/productsData.ts'
import { differenceTextClass, signedQty } from '../data.ts'

interface ApplyModalProps {
  target: Adjustment
  error: string | null
  /** Apply failed with STALE_STOCK, or the draft is already stale */
  isStale: boolean
  isPosting: boolean
  isRefreshing: boolean
  onClose: () => void
  onConfirm: () => void
  onRefresh: () => void
}

// Apply confirmation: DRAFT → DONE sets stock to the physical count and writes the ledger entry
export function ApplyModal({ target, error, isStale, isPosting, isRefreshing, onClose, onConfirm, onRefresh }: ApplyModalProps) {
  const unit = target.product.unitOfMeasure
  const isBusy = isPosting || isRefreshing

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4" id="applyAdjustmentModal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 pb-3 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">verified</span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm text-slate-900">Apply Inventory Adjustment?</h3>
            <p className="text-[11px] text-slate-500 mt-0.5" id="valRefTitle">
              Reference: {target.reference} · Writes one stock ledger entry
            </p>
          </div>
          <button className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-50" disabled={isBusy} onClick={onClose} type="button">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        {/* Details */}
        <div className="p-6 pt-2 flex flex-col gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Stock Correction</span>
              <span className={`font-mono font-semibold ${differenceTextClass(target.difference)}`}>
                {signedQty(target.difference)} {unit}
              </span>
            </div>
            <div className="text-[11px] text-slate-700 leading-relaxed font-sans" id="valDescription">
              Applying this adjustment sets the stock of <span className="font-semibold text-slate-900">{target.product.name}</span> ({target.product.sku}) at{' '}
              <span className="font-semibold text-slate-900">
                {target.warehouse.name} ({target.location.name})
              </span>{' '}
              from <span className="font-semibold text-rose-600">{formatQty(target.recordedQuantity)} {unit}</span> to <span className="font-semibold text-emerald-700">{formatQty(target.physicalQuantity)} {unit}</span>.
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Summary</span>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-slate-400">inventory</span>
                Recorded → Physical
              </span>
              <span className="font-mono font-semibold">
                {formatQty(target.recordedQuantity)} → {formatQty(target.physicalQuantity)} {unit}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-indigo-600">difference</span>
                Difference
              </span>
              <span className={`font-mono font-semibold ${differenceTextClass(target.difference)}`}>
                {signedQty(target.difference)} {unit}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 text-[11px]">
              <span className="flex items-center gap-1.5 flex-shrink-0">
                <span className="material-symbols-outlined text-[15px] text-slate-400">tag</span>
                Reason
              </span>
              <span className="font-semibold text-right truncate" title={target.reason}>
                {target.reason}
              </span>
            </div>
          </div>
          {isStale && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex flex-col gap-2">
              <span className="flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-amber-600">warning</span>
                <span>{error ?? `Stock at this location moved since the count was recorded (now ${formatQty(target.currentQuantity)} ${unit}). Refresh the recorded quantity before applying.`}</span>
              </span>
              <button className="self-start px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 text-[11px] font-semibold shadow-xs flex items-center gap-1 transition-colors disabled:opacity-50" disabled={isBusy} onClick={onRefresh} type="button">
                <span className={isRefreshing ? 'material-symbols-outlined text-[14px] animate-spin' : 'material-symbols-outlined text-[14px]'}>{isRefreshing ? 'progress_activity' : 'refresh'}</span>
                Refresh recorded quantity
              </button>
            </div>
          )}
          {error && !isStale && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
              <span>{error}</span>
            </div>
          )}
        </div>
        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
          <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50" disabled={isBusy} onClick={onClose} type="button">
            Cancel
          </button>
          <button className="px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled={isBusy || isStale} onClick={onConfirm} type="button">
            <span className={isPosting ? 'material-symbols-outlined text-[15px] animate-spin' : 'material-symbols-outlined text-[15px]'}>{isPosting ? 'progress_activity' : 'verified'}</span>
            <span>{isPosting ? 'Applying...' : 'Apply Adjustment'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
