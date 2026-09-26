import { DOCUMENT_STATUS_LABEL, type DocumentStatus, type Transfer } from '../../../api/types.ts'
import { isOpenStatus, shortLineCount } from '../data.ts'

export function StatusBadge({ status }: { status: DocumentStatus }) {
  switch (status) {
    case 'READY':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {DOCUMENT_STATUS_LABEL.READY}
        </span>
      )
    case 'WAITING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          {DOCUMENT_STATUS_LABEL.WAITING}
        </span>
      )
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          {DOCUMENT_STATUS_LABEL.DRAFT}
        </span>
      )
    case 'DONE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="material-symbols-outlined text-[12px] text-emerald-600">check</span>
          {DOCUMENT_STATUS_LABEL.DONE}
        </span>
      )
    case 'CANCELED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
          {DOCUMENT_STATUS_LABEL.CANCELED}
        </span>
      )
  }
}

/** Source availability for transfers that haven't moved yet (nothing for DONE / CANCELED) */
export function AvailabilityBadge({ transfer }: { transfer: Transfer }) {
  if (!isOpenStatus(transfer.status) || transfer.items.length === 0) return null
  const short = shortLineCount(transfer)
  if (short === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
        <span className="material-symbols-outlined text-[11px]">inventory</span>
        Stock OK
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60" title="The source location doesn't hold enough stock for every line">
      <span className="material-symbols-outlined text-[11px]">warning</span>
      {`Short: ${short} ${short === 1 ? 'line' : 'lines'}`}
    </span>
  )
}
