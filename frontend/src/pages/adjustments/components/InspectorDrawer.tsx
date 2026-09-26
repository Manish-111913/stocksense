import type { ReactNode } from 'react'
import type { Adjustment } from '../../../api/types.ts'
import { formatQty } from '../../products/productsData.ts'
import { differenceTextClass, formatDateTime, signedQty } from '../data.ts'
import { StaleBadge, StatusBadge } from './AdjustmentRow.tsx'

const PANEL_CLASS = 'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 transform transition-transform duration-300 flex flex-col'
const PANEL_CLOSED_CLASS = 'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 transform translate-x-full transition-transform duration-300 flex flex-col'

interface InspectorDrawerProps {
  isOpen: boolean
  /** Last selected adjustment (kept while the drawer slides out) */
  adjustment: Adjustment | null
  canApply: boolean
  isBusy: boolean
  onClose: () => void
  onApply: (adjustment: Adjustment) => void
  onEdit: (adjustment: Adjustment) => void
  onCancel: (adjustment: Adjustment) => void
  onRefresh: (adjustment: Adjustment) => void
}

function StatusBanner({ adjustment: a }: { adjustment: Adjustment }) {
  if (a.status === 'DONE') {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-900">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Current State</div>
          <div className="text-base font-bold text-emerald-950 mt-0.5">Applied</div>
          <p className="text-[11px] text-emerald-800 mt-0.5">
            Stock set to {formatQty(a.physicalQuantity)} {a.product.unitOfMeasure} and posted to the stock ledger.
          </p>
        </div>
        <span className="material-symbols-outlined text-3xl text-emerald-600">task_alt</span>
      </div>
    )
  }
  if (a.status === 'CANCELED') {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current State</div>
          <div className="text-base font-bold text-slate-900 mt-0.5">Canceled</div>
          <p className="text-[11px] text-slate-600 mt-0.5">This adjustment was voided. Stock was not changed.</p>
        </div>
        <span className="material-symbols-outlined text-3xl text-slate-400">cancel</span>
      </div>
    )
  }
  if (a.isStale) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-900">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Current State</div>
          <div className="text-base font-bold text-amber-950 mt-0.5">Draft · Stale</div>
          <p className="text-[11px] text-amber-800 mt-0.5">
            Stock moved since the count was recorded (now {formatQty(a.currentQuantity)} {a.product.unitOfMeasure}). Refresh before applying.
          </p>
        </div>
        <span className="material-symbols-outlined text-3xl text-amber-600">warning</span>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 border border-indigo-200/70 text-indigo-900">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Current State</div>
        <div className="text-base font-bold text-indigo-950 mt-0.5">Draft</div>
        <p className="text-[11px] text-indigo-800 mt-0.5">Counted, not applied yet. Stock is unchanged until an inventory manager applies it.</p>
      </div>
      <span className="material-symbols-outlined text-3xl text-indigo-600">edit_note</span>
    </div>
  )
}

function DetailLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-slate-800 text-right">{children}</span>
    </div>
  )
}

// Slide-over detail drawer (stays mounted so it can slide in and out)
export function InspectorDrawer({ isOpen, adjustment: a, canApply, isBusy, onClose, onApply, onEdit, onCancel, onRefresh }: InspectorDrawerProps) {
  const unit = a?.product.unitOfMeasure ?? ''
  const isDraft = a?.status === 'DRAFT'

  return (
    <div className={isOpen ? PANEL_CLASS : PANEL_CLOSED_CLASS} id="detailPanel">
      <div className="p-5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-indigo-600">receipt_long</span>
          <span className="font-bold text-sm text-slate-900 font-mono" id="panelRef">
            {a?.reference ?? ''}
          </span>
          {a && <StatusBadge status={a.status} />}
          {a && isDraft && a.isStale && <StaleBadge />}
        </div>
        <button className="w-8 h-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors" onClick={onClose} type="button">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      {a && (
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 text-xs">
          <StatusBanner adjustment={a} />
          {/* Product & location */}
          <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Product &amp; Location</span>
            <div className="flex items-center justify-between text-xs pt-1 gap-3">
              <div>
                <div className="font-semibold text-slate-900">{a.product.name}</div>
                <div className="text-slate-500 font-mono text-[11px]">SKU: {a.product.sku}</div>
              </div>
              <span className="material-symbols-outlined text-indigo-600 text-lg">location_on</span>
              <div className="text-right">
                <div className="font-semibold text-slate-900">{a.warehouse.name}</div>
                <div className="text-slate-500 font-mono text-[11px]">
                  {a.location.name} ({a.location.code})
                </div>
              </div>
            </div>
          </div>
          {/* Quantities */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Count</span>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Recorded</div>
                <div className="font-mono font-bold text-slate-700 text-sm mt-0.5">{formatQty(a.recordedQuantity)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Physical</div>
                <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{formatQty(a.physicalQuantity)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Difference</div>
                <div className={`font-mono font-bold text-sm mt-0.5 ${differenceTextClass(a.difference)}`}>{signedQty(a.difference)}</div>
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono px-1">
              <span>Unit: {unit}</span>
              <span>Current stock here: {formatQty(a.currentQuantity)} {unit}</span>
            </div>
          </div>
          {/* Reason */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason</span>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="font-semibold text-slate-900">{a.reason}</div>
              {a.notes ? <p className="text-[11px] text-slate-600 mt-1 whitespace-pre-wrap">{a.notes}</p> : <p className="text-[11px] text-slate-400 mt-1">No notes</p>}
            </div>
          </div>
          {/* Audit */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Audit Log</span>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 font-mono text-[11px] flex flex-col gap-2 text-slate-600">
              <DetailLine label="Created by:">{a.createdBy.fullName}</DetailLine>
              <DetailLine label="Created at:">{formatDateTime(a.createdAt)}</DetailLine>
              <DetailLine label="Last updated:">{formatDateTime(a.updatedAt)}</DetailLine>
              <div className="flex justify-between border-t border-slate-200/60 pt-2">
                <span className="text-slate-400">Applied by:</span>
                <span className="text-slate-900 font-semibold">{a.appliedBy?.fullName ?? '—'}</span>
              </div>
              <DetailLine label="Applied at:">{a.appliedAt ? formatDateTime(a.appliedAt) : '—'}</DetailLine>
              {a.status === 'DONE' && <DetailLine label="Ledger entry:">{a.difference >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT'}</DetailLine>}
            </div>
          </div>
        </div>
      )}
      {/* Footer actions (status-driven) */}
      <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2.5">
        <button className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors text-center" onClick={onClose} type="button">
          Close
        </button>
        {a && isDraft && (
          <>
            <button className="py-2 px-3 rounded-xl bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50" disabled={isBusy} onClick={() => onCancel(a)} type="button">
              Cancel
            </button>
            <button className="py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50" disabled={isBusy} onClick={() => onEdit(a)} type="button">
              Edit
            </button>
            {a.isStale ? (
              <button className="flex-1 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 text-xs font-semibold shadow-xs transition-all text-center flex items-center justify-center gap-1.5 disabled:opacity-50" disabled={isBusy} onClick={() => onRefresh(a)} type="button">
                <span className="material-symbols-outlined text-[15px]">refresh</span>
                <span>Refresh Recorded</span>
              </button>
            ) : (
              canApply && (
                <button className="flex-1 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs transition-all text-center flex items-center justify-center gap-1.5 disabled:opacity-50" disabled={isBusy} onClick={() => onApply(a)} type="button">
                  <span className="material-symbols-outlined text-[15px]">check</span>
                  <span>Apply</span>
                </button>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}
