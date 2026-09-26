import { type Transfer } from '../../../api/types.ts'
import { formatQty } from '../../products/productsData.ts'
import { shortLineCount, transferQuantityLabel } from '../data.ts'

interface ValidateModalProps {
  transfer: Transfer
  isPosting: boolean
  /** Server message from the last attempt (e.g. insufficient stock at the source) */
  error: string | null
  onClose: () => void
  onConfirm: () => void
}

// Validation confirmation dialog: READY → DONE (source −, destination +)
export function ValidateModal({ transfer, isPosting, error, onClose, onConfirm }: ValidateModalProps) {
  const source = `${transfer.sourceWarehouse.name} (${transfer.sourceLocation.name})`
  const destination = `${transfer.destinationWarehouse.name} (${transfer.destinationLocation.name})`
  const short = shortLineCount(transfer)

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4" id="validateModal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Validation Modal Header */}
        <div className="p-6 pb-3 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">verified</span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm text-slate-900">Validate Internal Transfer?</h3>
            <p className="text-[11px] text-slate-500 mt-0.5" id="valRefTitle">
              Reference: {transfer.reference} · Stock Ledger Posting
            </p>
          </div>
          <button className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-50" disabled={isPosting} onClick={onClose} type="button">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        {/* Validation Details & Flow */}
        <div className="p-6 pt-2 flex flex-col gap-4 text-xs max-h-[60vh] overflow-y-auto">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Stock Shift</span>
              <span className="font-mono text-emerald-700 font-semibold">Zero Net Delta</span>
            </div>
            <div className="text-[11px] text-slate-700 leading-relaxed font-sans" id="valDescription">
              Validating this transfer will deduct <span className="font-semibold text-rose-600">{transferQuantityLabel(transfer)}</span> from <span className="font-semibold text-slate-900">{source}</span> and credit it to{' '}
              <span className="font-semibold text-slate-900">{destination}</span>. Total company stock remains unchanged.
            </div>
          </div>
          {/* Lines with source availability */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">{`Lines (${transfer.items.length})`}</span>
            {transfer.items.map((item) => {
              const isShort = item.shortage > 0
              return (
                <div
                  className={
                    isShort
                      ? 'flex items-center justify-between gap-3 p-2 rounded-lg bg-rose-50 border border-rose-200/70 text-rose-800 text-[11px]'
                      : 'flex items-center justify-between gap-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[11px]'
                  }
                  key={item.id}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className={isShort ? 'material-symbols-outlined text-[15px] text-rose-600' : 'material-symbols-outlined text-[15px] text-emerald-600'}>{isShort ? 'warning' : 'check_circle'}</span>
                    <span className="truncate">
                      <span className="font-semibold">{item.productName}</span> <span className="font-mono text-[10px]">{item.sku}</span>
                    </span>
                  </span>
                  <span className="font-mono font-semibold text-right whitespace-nowrap">
                    {`${formatQty(item.quantity)} ${item.unitOfMeasure}`}
                    <span className="block text-[10px] font-normal">{isShort ? `Short ${formatQty(item.shortage)} (has ${formatQty(item.available)})` : `${formatQty(item.available)} at source`}</span>
                  </span>
                </div>
              )
            })}
          </div>
          {short > 0 && !error && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-amber-600">info</span>
              <span>The source looks short right now. Validation re-checks stock and nothing moves if a line can't be covered.</span>
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
              <span>{error}</span>
            </div>
          )}
        </div>
        {/* Validation Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
          <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50" disabled={isPosting} onClick={onClose} type="button">
            Cancel
          </button>
          <button className="px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-60" disabled={isPosting} onClick={onConfirm} type="button">
            <span className={isPosting ? 'material-symbols-outlined text-[15px] animate-spin' : 'material-symbols-outlined text-[15px]'}>{isPosting ? 'progress_activity' : 'verified'}</span>
            <span>{isPosting ? 'Validating...' : 'Validate Transfer'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
