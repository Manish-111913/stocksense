import type { Adjustment, DocumentStatus } from '../../../api/types.ts'
import { formatDate, formatQty } from '../../products/productsData.ts'
import { differenceBadgeClass, signedQty, statusLabel } from '../data.ts'

export function StatusBadge({ status }: { status: DocumentStatus }) {
  if (status === 'DONE') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
        <span className="material-symbols-outlined text-[12px]">done</span>
        {statusLabel(status)}
      </span>
    )
  }
  if (status === 'CANCELED') {
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">{statusLabel(status)}</span>
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      {statusLabel(status)}
    </span>
  )
}

export function StaleBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60" title="Stock moved since this count was recorded. Refresh before applying.">
      <span className="material-symbols-outlined text-[12px]">warning</span>
      Stale
    </span>
  )
}

const ICON_BUTTON = 'p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

interface AdjustmentRowProps {
  adjustment: Adjustment
  /** An action on this row is in flight */
  isBusy: boolean
  /** Inventory managers only */
  canApply: boolean
  onInspect: (adjustment: Adjustment) => void
  onApply: (adjustment: Adjustment) => void
  onEdit: (adjustment: Adjustment) => void
  onCancel: (adjustment: Adjustment) => void
  onRefresh: (adjustment: Adjustment) => void
}

export function AdjustmentRow({ adjustment: a, isBusy, canApply, onInspect, onApply, onEdit, onCancel, onRefresh }: AdjustmentRowProps) {
  const isDraft = a.status === 'DRAFT'
  const isCanceled = a.status === 'CANCELED'
  const unit = a.product.unitOfMeasure

  return (
    <tr className={isCanceled ? 'hover:bg-slate-50/60 transition-colors group cursor-pointer opacity-75' : 'hover:bg-slate-50/60 transition-colors group cursor-pointer'} onClick={() => onInspect(a)}>
      <td className="py-3.5 px-5 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-indigo-600">tune</span>
          <span className={isCanceled ? 'font-bold text-slate-500 line-through group-hover:underline' : 'font-bold text-indigo-600 group-hover:underline'}>{a.reference}</span>
        </div>
      </td>
      <td className="py-3.5 px-5">
        <div className="font-semibold text-slate-900">{a.product.name}</div>
        <div className="text-[11px] text-slate-500 font-mono">SKU: {a.product.sku}</div>
      </td>
      <td className="py-3.5 px-5">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] text-slate-400 mt-0.5">warehouse</span>
          <div>
            <div className="font-semibold text-slate-900">{a.warehouse.name}</div>
            <div className="text-[11px] text-slate-500 font-mono">{a.location.name}</div>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-5 text-right font-mono text-slate-500">
        {formatQty(a.recordedQuantity)} {unit}
      </td>
      <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900">
        {formatQty(a.physicalQuantity)} {unit}
      </td>
      <td className="py-3.5 px-4 text-center">
        <span className={differenceBadgeClass(a.difference)}>
          {signedQty(a.difference)} {unit}
        </span>
      </td>
      <td className="py-3.5 px-5">
        <div className="font-semibold text-slate-900">{a.reason}</div>
        {a.notes && <div className="text-[11px] text-slate-500 font-mono truncate max-w-[140px]" title={a.notes}>{a.notes}</div>}
      </td>
      <td className="py-3.5 px-4 text-center">
        <div className="flex flex-col items-center gap-1">
          <StatusBadge status={a.status} />
          {isDraft && a.isStale && <StaleBadge />}
        </div>
      </td>
      <td className="py-3.5 px-5">
        <div className="font-mono text-[11px] text-slate-700">{formatDate(a.createdAt)}</div>
        <div className="text-[11px] text-slate-500">by {a.createdBy.fullName}</div>
      </td>
      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          {isDraft && a.isStale && (
            <button className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1 transition-all disabled:opacity-50" disabled={isBusy} onClick={() => onRefresh(a)} title="Refresh recorded quantity">
              <span className="material-symbols-outlined text-[15px]">refresh</span>
              <span>Refresh</span>
            </button>
          )}
          {isDraft && canApply && (
            <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-all disabled:opacity-50" disabled={isBusy} onClick={() => onApply(a)}>
              <span className="material-symbols-outlined text-[15px]">bolt</span>
              <span>Apply</span>
            </button>
          )}
          {isDraft && (
            <button className={ICON_BUTTON} disabled={isBusy} onClick={() => onEdit(a)} title="Edit draft">
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          )}
          {isDraft && (
            <button className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={isBusy} onClick={() => onCancel(a)} title="Cancel adjustment">
              <span className="material-symbols-outlined text-[18px]">block</span>
            </button>
          )}
          {!isDraft && (
            <button className={ICON_BUTTON} onClick={() => onInspect(a)} title="View details">
              <span className="material-symbols-outlined text-[18px]">visibility</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
