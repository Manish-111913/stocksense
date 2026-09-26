import { ROW_TONES, type Transfer, type TransferRowStatus, type ValidateTarget } from '../data.ts'

function StatusBadge({ status }: { status: TransferRowStatus }) {
  switch (status) {
    case 'Ready':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Ready
        </span>
      )
    case 'Waiting':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          In Transit
        </span>
      )
    case 'Done':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <span className="material-symbols-outlined text-[12px] text-emerald-600">check</span>
          Done
        </span>
      )
  }
}

interface TransferRowProps {
  transfer: Transfer
  onOpenDetail: (ref: string) => void
  onValidate: (target: ValidateTarget) => void
}

export function TransferRow({ transfer, onOpenDetail, onValidate }: TransferRowProps) {
  const tone = ROW_TONES[transfer.status]
  const { ref, validation } = transfer

  function renderActions() {
    switch (transfer.status) {
      case 'Ready':
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-all" onClick={() => validation && onValidate(validation)}>
              <span className="material-symbols-outlined text-[15px]">check</span>
              <span>Validate</span>
            </button>
            <button className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => onOpenDetail(ref)} title="View Transfer Ledger">
              <span className="material-symbols-outlined text-[18px]">visibility</span>
            </button>
          </div>
        )
      case 'Waiting':
        return (
          <div className="flex items-center justify-end gap-2">
            <span className="text-[11px] text-slate-400 italic font-mono">{transfer.eta}</span>
            <button className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => onOpenDetail(ref)}>
              <span className="material-symbols-outlined text-[18px]">visibility</span>
            </button>
          </div>
        )
      case 'Done':
        return (
          <button className="px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors" onClick={() => onOpenDetail(ref)}>
            View Ledger
          </button>
        )
    }
  }

  return (
    <tr className="hover:bg-slate-50/60 transition-colors group cursor-pointer" onClick={() => onOpenDetail(ref)}>
      <td className="py-3.5 px-5 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span className={tone.refIconClass}>{tone.refIcon}</span>
          <span className={tone.refTextClass}>{ref}</span>
        </div>
        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{transfer.batch}</span>
      </td>
      <td className="py-3.5 px-5">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] text-slate-400 mt-0.5">warehouse</span>
          <div>
            <div className="font-semibold text-slate-900">{transfer.source.warehouse}</div>
            <div className="text-[11px] text-slate-500 font-mono">{transfer.source.location}</div>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-5">
        <div className="flex items-start gap-2">
          <span className={tone.destinationIconClass}>{transfer.destination.icon}</span>
          <div>
            <div className="font-semibold text-slate-900">{transfer.destination.warehouse}</div>
            <div className="text-[11px] text-slate-500 font-mono">{transfer.destination.location}</div>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-4 text-center">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">{transfer.items}</span>
      </td>
      <td className="py-3.5 px-5 text-right font-mono">
        <div className="font-bold text-slate-900">{transfer.quantity}</div>
        <div className="text-[11px] text-slate-500 font-sans truncate">{transfer.product}</div>
      </td>
      <td className="py-3.5 px-4 text-center">
        <StatusBadge status={transfer.status} />
      </td>
      <td className="py-3.5 px-5">
        <div className="font-mono text-xs font-semibold text-slate-800">{transfer.date}</div>
        <div className="font-mono text-[10px] text-slate-400">{transfer.time}</div>
      </td>
      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
        {renderActions()}
      </td>
    </tr>
  )
}
