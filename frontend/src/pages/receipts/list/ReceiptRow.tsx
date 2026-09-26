import { type MouseEvent } from 'react'
import { DOCUMENT_STATUS_LABEL, type DocumentStatus, type Receipt } from '../../../api/types.ts'
import { formatReceiptDate, linesLabel, receiptProductsNote, receiptQuantityLabel, ROW_TONES } from './receiptsData.ts'

function StatusBadge({ status }: { status: DocumentStatus }) {
  switch (status) {
    case 'READY':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{DOCUMENT_STATUS_LABEL.READY}
        </span>
      )
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{DOCUMENT_STATUS_LABEL.DRAFT}
        </span>
      )
    case 'WAITING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{DOCUMENT_STATUS_LABEL.WAITING}
        </span>
      )
    case 'DONE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="material-symbols-outlined text-[12px]">done</span>{DOCUMENT_STATUS_LABEL.DONE}
        </span>
      )
    case 'CANCELED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
          {DOCUMENT_STATUS_LABEL.CANCELED}
        </span>
      )
  }
}

const DETAIL_BUTTON = 'px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-all'
const SECONDARY_BUTTON = 'px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-[11px] shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed'
const PRIMARY_BUTTON = 'px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px] shadow-xs flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
const CANCEL_ICON_BUTTON = 'p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

interface ReceiptRowProps {
  receipt: Receipt
  /** An action on this row is in flight */
  isBusy: boolean
  onOpen: (receipt: Receipt) => void
  onConfirm: (receipt: Receipt) => void
  onMarkReady: (receipt: Receipt) => void
  onValidate: (receipt: Receipt) => void
  onCancel: (receipt: Receipt) => void
}

export function ReceiptRow({ receipt, isBusy, onOpen, onConfirm, onMarkReady, onValidate, onCancel }: ReceiptRowProps) {
  const tone = ROW_TONES[receipt.status]

  function handleRefClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    event.stopPropagation()
    onOpen(receipt)
  }

  // Action buttons must not trigger the row click (which opens the receipt)
  const act = (handler: (r: Receipt) => void) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    handler(receipt)
  }

  const cancelButton = (
    <button className={CANCEL_ICON_BUTTON} disabled={isBusy} onClick={act(onCancel)} title="Cancel receipt">
      <span className="material-symbols-outlined text-[17px]">block</span>
    </button>
  )

  function renderActions() {
    switch (receipt.status) {
      case 'READY':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className={PRIMARY_BUTTON} disabled={isBusy} onClick={act(onValidate)}>
              <span className="material-symbols-outlined text-[13px]">check_circle</span> Validate
            </button>
            {cancelButton}
          </div>
        )
      case 'DRAFT':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className={SECONDARY_BUTTON} disabled={isBusy} onClick={act(onOpen)}>
              Edit
            </button>
            <button className={PRIMARY_BUTTON} disabled={isBusy} onClick={act(onConfirm)}>
              <span className="material-symbols-outlined text-[13px]">task_alt</span> Confirm
            </button>
            {cancelButton}
          </div>
        )
      case 'WAITING':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className={PRIMARY_BUTTON} disabled={isBusy} onClick={act(onMarkReady)}>
              <span className="material-symbols-outlined text-[13px]">inventory</span> Mark Ready
            </button>
            {cancelButton}
          </div>
        )
      case 'DONE':
      case 'CANCELED':
        return (
          <button className={DETAIL_BUTTON} onClick={act(onOpen)}>
            View Details
          </button>
        )
    }
  }

  return (
    <tr className={tone.rowClass} data-status={receipt.status} onClick={() => onOpen(receipt)}>
      <td className="py-3.5 px-4">
        <a className={tone.refLinkClass} href="#" onClick={handleRefClick}>
          <span className={tone.refIconClass}>
            <span className="material-symbols-outlined text-[14px]">{tone.refIcon}</span>
          </span>
          <span>{receipt.reference}</span>
        </a>
      </td>
      <td className="py-3.5 px-4">
        <div className={tone.supplierClass}>
          <span className="material-symbols-outlined text-[15px] text-slate-400">corporate_fare</span>
          <span>{receipt.supplier.name}</span>
        </div>
        {receipt.supplier.code && <div className="font-mono text-[10px] text-slate-400 pl-5">{receipt.supplier.code}</div>}
      </td>
      <td className="py-3.5 px-4">
        <div className={tone.destinationClass}>
          <span className="material-symbols-outlined text-[15px] text-slate-400">warehouse</span>
          <span>{receipt.warehouse.name}</span>
        </div>
        <div className="text-[10px] text-slate-400 pl-5">
          {receipt.location.name} <span className="font-mono">({receipt.location.code})</span>
        </div>
      </td>
      <td className="py-3.5 px-4">
        <span className={tone.itemsClass}>{linesLabel(receipt.lineCount)}</span>
      </td>
      <td className="py-3.5 px-4 text-right">
        <span className={tone.quantityClass}>{receiptQuantityLabel(receipt)}</span>
        <span className="block text-[10px] text-slate-400">{receiptProductsNote(receipt)}</span>
      </td>
      <td className="py-3.5 px-4 text-center">
        <StatusBadge status={receipt.status} />
      </td>
      <td className="py-3.5 px-4">
        <div className={tone.dateClass}>{formatReceiptDate(receipt.receiptDate)}</div>
        <div className="text-[10px] text-slate-400">by {receipt.createdBy.fullName}</div>
      </td>
      <td className="py-3.5 px-4 text-right">{renderActions()}</td>
    </tr>
  )
}
