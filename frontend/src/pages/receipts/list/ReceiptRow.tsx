import { type MouseEvent } from 'react'
import { ROW_TONES, type Receipt, type ReceiptStatus } from './receiptsData.ts'

function StatusBadge({ status }: { status: ReceiptStatus }) {
  switch (status) {
    case 'Ready':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Ready
        </span>
      )
    case 'Draft':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Draft
        </span>
      )
    case 'Waiting':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />Waiting
        </span>
      )
    case 'Done':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="material-symbols-outlined text-[12px]">done</span>Done
        </span>
      )
    case 'Canceled':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
          Canceled
        </span>
      )
  }
}

const DETAIL_BUTTON = 'px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-all'

interface ReceiptRowProps {
  receipt: Receipt
  hidden: boolean
  onOpenDetail: (ref: string) => void
  onValidate: (receipt: Receipt) => void
  onEditDraft: (ref: string) => void
  onDiscardDraft: (ref: string) => void
}

export function ReceiptRow({ receipt, hidden, onOpenDetail, onValidate, onEditDraft, onDiscardDraft }: ReceiptRowProps) {
  const tone = ROW_TONES[receipt.tone]
  const { ref } = receipt

  function handleRefClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    onOpenDetail(ref)
  }

  function renderActions() {
    switch (receipt.status) {
      case 'Ready':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px] shadow-xs flex items-center gap-1 transition-all active:scale-95" onClick={() => onValidate(receipt)}>
              <span className="material-symbols-outlined text-[13px]">check_circle</span> Validate
            </button>
            <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => onOpenDetail(ref)} title="Inspect lines">
              <span className="material-symbols-outlined text-[17px]">visibility</span>
            </button>
          </div>
        )
      case 'Draft':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-[11px] shadow-xs transition-all" onClick={() => onEditDraft(ref)}>
              Edit
            </button>
            <button className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" onClick={() => onDiscardDraft(ref)} title="Discard draft">
              <span className="material-symbols-outlined text-[17px]">delete</span>
            </button>
          </div>
        )
      case 'Done':
        return (
          <button className={DETAIL_BUTTON} onClick={() => onOpenDetail(ref)}>
            View Details
          </button>
        )
      case 'Waiting':
        return (
          <button className={DETAIL_BUTTON} onClick={() => onOpenDetail(ref)}>
            Track Cargo
          </button>
        )
      case 'Canceled':
        return (
          <button className={DETAIL_BUTTON} onClick={() => onOpenDetail(ref)}>
            Audit Log
          </button>
        )
    }
  }

  return (
    <tr className={tone.rowClass} data-status={receipt.status} data-supplier={receipt.supplier} data-wh={receipt.warehouse} style={hidden ? { display: 'none' } : undefined}>
      <td className="py-3.5 px-4">
        <a className={tone.refLinkClass} href="#" onClick={handleRefClick}>
          <span className={tone.refIconClass}>
            <span className="material-symbols-outlined text-[14px]">{tone.refIcon}</span>
          </span>
          <span>{ref}</span>
        </a>
      </td>
      <td className="py-3.5 px-4">
        <div className={tone.supplierClass}>
          <span className="material-symbols-outlined text-[15px] text-slate-400">corporate_fare</span>
          <span>{receipt.supplier}</span>
        </div>
        <div className="font-mono text-[10px] text-slate-400 pl-5">{receipt.supplierCode}</div>
      </td>
      <td className="py-3.5 px-4">
        <div className={tone.destinationClass}>
          <span className="material-symbols-outlined text-[15px] text-slate-400">{receipt.destinationIcon}</span>
          <span>{receipt.destination}</span>
        </div>
        <div className="text-[10px] text-slate-400 pl-5">{receipt.zone}</div>
      </td>
      <td className="py-3.5 px-4">
        <span className={tone.itemsClass}>{receipt.items}</span>
      </td>
      <td className="py-3.5 px-4 text-right">
        <span className={tone.quantityClass}>{receipt.quantity}</span>
        <span className="block text-[10px] text-slate-400">{receipt.quantityNote}</span>
      </td>
      <td className="py-3.5 px-4 text-center">
        <StatusBadge status={receipt.status} />
      </td>
      <td className="py-3.5 px-4">
        <div className={tone.dateClass}>{receipt.date}</div>
        <div className="text-[10px] text-slate-400">{receipt.time}</div>
      </td>
      <td className="py-3.5 px-4 text-right">{renderActions()}</td>
    </tr>
  )
}
