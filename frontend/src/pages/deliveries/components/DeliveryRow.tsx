import { type MouseEvent } from 'react'
import { ROW_TONES, type Delivery, type DeliveryStatus, type ValidateTarget } from '../data.ts'

function StatusBadge({ status, pulse }: { status: DeliveryStatus; pulse?: boolean }) {
  switch (status) {
    case 'Ready':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <span className={pulse ? 'w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse' : 'w-1.5 h-1.5 rounded-full bg-indigo-600'} />
          Ready
        </span>
      )
    case 'Waiting':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Waiting
        </span>
      )
    case 'Draft':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Draft
        </span>
      )
    case 'Done':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="material-symbols-outlined text-[12px]">done_all</span>
          Done
        </span>
      )
    case 'Canceled':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">Canceled</span>
  }
}

interface DeliveryRowProps {
  delivery: Delivery
  hidden: boolean
  onOpenDetail: (ref: string) => void
  onValidate: (target: ValidateTarget) => void
  onQuickPick: (ref: string) => void
  onEditDraft: (ref: string) => void
  onDiscardDraft: (ref: string) => void
  onViewLedger: (ledgerId: string) => void
  onViewAuditLog: (ref: string) => void
}

export function DeliveryRow({ delivery, hidden, onOpenDetail, onValidate, onQuickPick, onEditDraft, onDiscardDraft, onViewLedger, onViewAuditLog }: DeliveryRowProps) {
  const tone = ROW_TONES[delivery.tone]
  const isCanceled = delivery.tone === 'Canceled'
  const { ref, actions } = delivery

  function handleRefClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    onOpenDetail(ref)
  }

  function renderActions() {
    switch (actions.kind) {
      case 'ready':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shadow-xs transition-all flex items-center gap-1" onClick={() => onValidate(actions.validate)}>
              <span className="material-symbols-outlined text-[14px]">task_alt</span>
              <span>Validate</span>
            </button>
            <button className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" onClick={() => onOpenDetail(ref)} title={actions.detailTitle}>
              <span className="material-symbols-outlined text-[16px]">visibility</span>
            </button>
          </div>
        )
      case 'picked':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shadow-xs flex items-center gap-1" onClick={() => onValidate(actions.validate)}>
              <span className="material-symbols-outlined text-[14px]">task_alt</span>
              <span>Validate</span>
            </button>
            <button className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600" onClick={() => onOpenDetail(ref)}>
              <span className="material-symbols-outlined text-[16px]">visibility</span>
            </button>
          </div>
        )
      case 'waiting':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] shadow-xs transition-all flex items-center gap-1" onClick={() => onQuickPick(ref)}>
              <span className="material-symbols-outlined text-[14px]">forklift</span>
              <span>Pick Order</span>
            </button>
            <button className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" onClick={() => onOpenDetail(ref)}>
              <span className="material-symbols-outlined text-[16px]">visibility</span>
            </button>
          </div>
        )
      case 'draft':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px] transition-all" onClick={() => onEditDraft(ref)}>
              Edit
            </button>
            <button className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors" onClick={() => onDiscardDraft(ref)} title="Discard unreserved draft">
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        )
      case 'done':
        return (
          <button className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-all flex items-center gap-1" onClick={() => onViewLedger(actions.ledgerId)}>
            <span className="material-symbols-outlined text-[13px]">receipt_long</span>
            <span>Ledger Post</span>
          </button>
        )
      case 'canceled':
        return (
          <button className="px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-500 hover:text-slate-800 text-[11px] font-medium transition-colors" onClick={() => onViewAuditLog(ref)}>
            Audit Log
          </button>
        )
    }
  }

  return (
    <tr className={tone.rowClass} data-loc={delivery.location} data-status={delivery.status} data-wh={delivery.warehouse} style={hidden ? { display: 'none' } : undefined}>
      <td className={tone.refCellClass}>
        {tone.refLink ? (
          <a className="hover:underline flex items-center gap-1.5" href="#" onClick={handleRefClick}>
            <span className={tone.refIconClass}>{tone.refIcon}</span>
            <span>{ref}</span>
          </a>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={tone.refIconClass}>{tone.refIcon}</span>
            <span>{ref}</span>
          </div>
        )}
      </td>
      {isCanceled ? (
        <>
          <td className="py-3 px-4 font-medium text-slate-600">
            <div className="font-medium line-through">{delivery.customer}</div>
            <div className="text-[11px] text-slate-400 font-mono">{delivery.customerNote}</div>
          </td>
          <td className="py-3 px-4 text-slate-500">
            <div>{delivery.warehouse}</div>
            <div className="text-[11px] text-slate-400">{delivery.location}</div>
          </td>
          <td className="py-3 px-3 text-center">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] text-slate-500">{delivery.lines}</span>
          </td>
          <td className="py-3 px-4 text-right font-metric-tabular-sm text-metric-tabular-sm text-slate-400 whitespace-nowrap">{delivery.quantity}</td>
        </>
      ) : (
        <>
          <td className="py-3 px-4 font-medium text-slate-900">
            <div className="font-semibold">{delivery.customer}</div>
            <div className="text-[11px] text-slate-400 font-mono">{delivery.customerNote}</div>
          </td>
          <td className="py-3 px-4">
            <div className="font-medium text-slate-800">{delivery.warehouse}</div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">pin_drop</span>
              <span>{delivery.location}</span>
            </div>
          </td>
          <td className="py-3 px-3 text-center">
            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-semibold text-slate-700">{delivery.lines}</span>
          </td>
          <td className="py-3 px-4 text-right font-metric-tabular-sm text-metric-tabular-sm text-slate-900 font-bold whitespace-nowrap">
            {delivery.quantity}
            {delivery.quantityNote && (
              <>
                {' '}
                <span className="text-[10px] text-slate-400 font-normal">{delivery.quantityNote}</span>
              </>
            )}
          </td>
        </>
      )}
      <td className="py-3 px-4 text-center">
        <StatusBadge pulse={delivery.pulse} status={delivery.status} />
      </td>
      <td className={tone.dateCellClass}>
        <div>{delivery.date}</div>
        <div className={tone.timeClass}>{delivery.time}</div>
      </td>
      <td className="py-3 px-4 text-right whitespace-nowrap">{renderActions()}</td>
    </tr>
  )
}
