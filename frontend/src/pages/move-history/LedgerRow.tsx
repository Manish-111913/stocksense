import { type MouseEvent } from 'react'
import { type FlowPoint, type LedgerRecord, MOVEMENT_BADGES } from './data.ts'

interface LedgerRowProps {
  row: LedgerRecord
  onInspect: () => void
}

function preventDefault(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
}

function FlowPointLabel({ point }: { point: FlowPoint }) {
  return (
    <span className={point.className}>
      {point.label}
      {point.sub && (
        <>
          {' '}
          <span className={point.sub.className}>{point.sub.label}</span>
        </>
      )}
    </span>
  )
}

export function LedgerRow({ row, onInspect }: LedgerRowProps) {
  const badge = MOVEMENT_BADGES[row.type]
  const { flow } = row

  function handleInspectClick(event: MouseEvent<HTMLButtonElement>) {
    onInspect()
    event.stopPropagation()
  }

  return (
    <tr className={row.highlighted ? 'hover:bg-indigo-50/40 bg-indigo-50/20 transition-colors cursor-pointer group' : 'hover:bg-slate-50/80 transition-colors'} onClick={row.highlighted ? onInspect : undefined}>
      <td className="py-3.5 px-4 whitespace-nowrap">
        <div className="font-mono font-medium text-slate-900">{row.timestamp}</div>
        <div className="font-mono text-[10px] text-slate-400">TX: {row.txHash}</div>
      </td>
      <td className="py-3.5 px-4 whitespace-nowrap">
        <a className="font-mono font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1" href="#" onClick={preventDefault}>
          {row.reference}
          <span className="material-symbols-outlined text-[13px]">arrow_outward</span>
        </a>
        <div className="text-[11px] text-slate-400 font-mono">{row.referenceMeta}</div>
      </td>
      <td className="py-3.5 px-4 whitespace-nowrap">
        <span className={badge.className}>
          <span className="material-symbols-outlined text-[13px]">{badge.icon}</span>
          {badge.label}
        </span>
      </td>
      <td className="py-3.5 px-4">
        <div className="font-semibold text-slate-900">{row.product}</div>
        <div className="font-mono text-[11px] text-slate-500">SKU: {row.sku} · {row.category}</div>
      </td>
      <td className="py-3.5 px-4 whitespace-nowrap text-right">
        <span className={row.quantityClassName}>
          {row.quantity}
        </span>
        <div className={row.quantityNoteClassName}>{row.quantityNote}</div>
      </td>
      <td className="py-3.5 px-4">
        {flow.kind === 'route'
          ? (
              <div className="flex items-center gap-1.5 text-xs">
                <FlowPointLabel point={flow.from} />
                <span className={flow.arrowClassName}>arrow_forward</span>
                <FlowPointLabel point={flow.to} />
              </div>
            )
          : (
              <div className="text-xs">
                <span className="font-medium text-slate-800">{flow.location} <span className="text-slate-400 font-normal">{flow.bay}</span></span>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">{flow.detail}</div>
              </div>
            )}
        <div className={row.flowNoteClassName}>{row.flowNote}</div>
      </td>
      <td className="py-3.5 px-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button className={row.highlighted ? 'p-1 rounded text-indigo-600 hover:bg-indigo-100 transition-colors' : 'p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors'} onClick={row.highlighted ? handleInspectClick : undefined} title="Inspect Record">
            <span className="material-symbols-outlined text-[17px]">visibility</span>
          </button>
          <a className="text-indigo-600 hover:underline font-medium text-[11px]" href="#" onClick={preventDefault}>Inspect</a>
        </div>
      </td>
    </tr>
  )
}
