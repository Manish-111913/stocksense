import { DIFFERENCE_BADGE, STATUS_LABELS, type Adjustment } from '../data.ts'

interface AdjustmentRowProps {
  adjustment: Adjustment
  onInspect: (ref: string) => void
  onApply: (adjustment: Adjustment) => void
}

export function AdjustmentRow({ adjustment: a, onInspect, onApply }: AdjustmentRowProps) {
  return (
    <tr className="hover:bg-slate-50/60 transition-colors group cursor-pointer" onClick={() => onInspect(a.ref)}>
      <td className="py-3.5 px-5 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-indigo-600">tune</span>
          <span className="font-bold text-indigo-600 group-hover:underline">{a.ref}</span>
        </div>
        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">TX-HASH: {a.txHash}</span>
      </td>
      <td className="py-3.5 px-5">
        <div className="font-semibold text-slate-900">{a.product}</div>
        <div className="text-[11px] text-slate-500 font-mono">SKU: {a.sku} · {a.skuNote}</div>
      </td>
      <td className="py-3.5 px-5">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] text-slate-400 mt-0.5">warehouse</span>
          <div>
            <div className="font-semibold text-slate-900">{a.warehouse}</div>
            <div className="text-[11px] text-slate-500 font-mono">{a.location}</div>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-5 text-right font-mono text-slate-500">{a.recordedQty}</td>
      <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900">{a.countedQty}</td>
      <td className="py-3.5 px-4 text-center">
        <span className={DIFFERENCE_BADGE[a.variance]}>{a.difference}</span>
      </td>
      <td className="py-3.5 px-5">
        <div className="font-semibold text-slate-900">{a.reason}</div>
        <div className="text-[11px] text-slate-500 font-mono truncate max-w-[140px]">{a.reasonNote}</div>
      </td>
      <td className="py-3.5 px-4 text-center">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {STATUS_LABELS[a.status]}
        </span>
      </td>
      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-all" onClick={() => onApply(a)}>
            <span className="material-symbols-outlined text-[15px]">bolt</span>
            <span>Apply</span>
          </button>
          <button className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => onInspect(a.ref)} title="View Audit Spec">
            <span className="material-symbols-outlined text-[18px]">visibility</span>
          </button>
        </div>
      </td>
    </tr>
  )
}
