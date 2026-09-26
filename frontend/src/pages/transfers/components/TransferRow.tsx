import { type MouseEvent } from 'react'
import { type Transfer } from '../../../api/types.ts'
import { formatTransferDate, linesLabel, ROW_TONES, transferProductsNote, transferQuantityLabel } from '../data.ts'
import { AvailabilityBadge, StatusBadge } from './StatusBadge.tsx'

const PRIMARY_BUTTON = 'px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
const SECONDARY_BUTTON = 'px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed'
const CANCEL_ICON_BUTTON = 'p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

interface TransferRowProps {
  transfer: Transfer
  /** An action on this row is in flight */
  isBusy: boolean
  onOpenDetail: (transfer: Transfer) => void
  onConfirm: (transfer: Transfer) => void
  onEdit: (transfer: Transfer) => void
  onCheckAvailability: (transfer: Transfer) => void
  onValidate: (transfer: Transfer) => void
  onCancel: (transfer: Transfer) => void
}

export function TransferRow({ transfer, isBusy, onOpenDetail, onConfirm, onEdit, onCheckAvailability, onValidate, onCancel }: TransferRowProps) {
  const tone = ROW_TONES[transfer.status]

  // Action buttons must not trigger the row click (which opens the detail panel)
  const act = (handler: (t: Transfer) => void) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    handler(transfer)
  }

  const cancelButton = (
    <button className={CANCEL_ICON_BUTTON} disabled={isBusy} onClick={act(onCancel)} title="Cancel transfer">
      <span className="material-symbols-outlined text-[18px]">block</span>
    </button>
  )

  function renderActions() {
    switch (transfer.status) {
      case 'DRAFT':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className={PRIMARY_BUTTON} disabled={isBusy} onClick={act(onConfirm)}>
              <span className="material-symbols-outlined text-[15px]">task_alt</span>
              <span>Confirm</span>
            </button>
            <button className={SECONDARY_BUTTON} disabled={isBusy} onClick={act(onEdit)}>
              Edit
            </button>
            {cancelButton}
          </div>
        )
      case 'WAITING':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className={PRIMARY_BUTTON} disabled={isBusy} onClick={act(onCheckAvailability)}>
              <span className="material-symbols-outlined text-[15px]">inventory</span>
              <span>Check Availability</span>
            </button>
            {cancelButton}
          </div>
        )
      case 'READY':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className={PRIMARY_BUTTON} disabled={isBusy} onClick={act(onValidate)}>
              <span className="material-symbols-outlined text-[15px]">check</span>
              <span>Validate</span>
            </button>
            {cancelButton}
          </div>
        )
      case 'DONE':
      case 'CANCELED':
        return (
          <button className="px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors" onClick={act(onOpenDetail)}>
            View
          </button>
        )
    }
  }

  return (
    <tr className="hover:bg-slate-50/60 transition-colors group cursor-pointer" data-status={transfer.status} onClick={() => onOpenDetail(transfer)}>
      <td className="py-3.5 px-5 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span className={tone.refIconClass}>{tone.refIcon}</span>
          <span className={tone.refTextClass}>{transfer.reference}</span>
        </div>
      </td>
      <td className="py-3.5 px-5">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] text-slate-400 mt-0.5">warehouse</span>
          <div>
            <div className="font-semibold text-slate-900">{transfer.sourceWarehouse.name}</div>
            <div className="text-[11px] text-slate-500 font-mono">{`${transfer.sourceLocation.name} (${transfer.sourceLocation.code})`}</div>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-5">
        <div className="flex items-start gap-2">
          <span className={tone.destinationIconClass}>location_on</span>
          <div>
            <div className="font-semibold text-slate-900">{transfer.destinationWarehouse.name}</div>
            <div className="text-[11px] text-slate-500 font-mono">{`${transfer.destinationLocation.name} (${transfer.destinationLocation.code})`}</div>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-4 text-center">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">{linesLabel(transfer.lineCount)}</span>
      </td>
      <td className="py-3.5 px-5 text-right font-mono">
        <div className="font-bold text-slate-900">{transferQuantityLabel(transfer)}</div>
        <div className="text-[11px] text-slate-500 font-sans truncate max-w-[180px] ml-auto">{transferProductsNote(transfer)}</div>
      </td>
      <td className="py-3.5 px-4 text-center">
        <div className="flex flex-col items-center">
          <StatusBadge status={transfer.status} />
          <AvailabilityBadge transfer={transfer} />
        </div>
      </td>
      <td className="py-3.5 px-5">
        <div className="font-mono text-xs font-semibold text-slate-800">{formatTransferDate(transfer.transferDate)}</div>
        <div className="text-[10px] text-slate-400">by {transfer.createdBy.fullName}</div>
      </td>
      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
        {renderActions()}
      </td>
    </tr>
  )
}
