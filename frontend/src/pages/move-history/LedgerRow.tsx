import { type MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import type { LedgerEntry, LedgerPlace } from '../../api/types.ts'
import { balanceChange, DIRECTION_LABEL, documentPath, entryLabel, formatDateTime, isOutgoing, MOVEMENT_BADGES, signedQty } from './data.ts'

interface LedgerRowProps {
  entry: LedgerEntry
  isSelected: boolean
  onInspect: (entry: LedgerEntry) => void
}

const QTY_INDIGO = 'inline-flex items-center px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-semibold text-xs'
const QTY_EMERALD = 'inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-semibold text-xs'
const QTY_ROSE = 'inline-flex items-center px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono font-semibold text-xs'
const QTY_NOTE_SLATE = 'text-[10px] font-mono text-slate-400 mt-0.5'
const QTY_NOTE_EMERALD = 'text-[10px] font-mono text-emerald-600 mt-0.5'
const POINT_DARK = 'font-medium text-slate-800'
const POINT_MUTED = 'font-medium text-slate-500'
const POINT_INDIGO = 'font-medium text-indigo-700'
const SUB_SLATE = 'text-slate-400 font-normal'
const SUB_INDIGO = 'text-indigo-400 font-normal'

function PlaceLabel({ place, highlight }: { place: LedgerPlace; highlight?: boolean }) {
  return (
    <span className={highlight ? POINT_INDIGO : POINT_DARK}>
      {place.name}{' '}
      <span className={highlight ? SUB_INDIGO : SUB_SLATE}>{place.code}</span>
    </span>
  )
}

function quantityStyle(entry: LedgerEntry): { className: string; note: string; noteClassName: string } {
  switch (entry.movementType) {
    case 'INTERNAL_TRANSFER':
      return { className: QTY_INDIGO, note: isOutgoing(entry) ? 'Transfer Out · Source' : 'Transfer In · Destination', noteClassName: QTY_NOTE_SLATE }
    case 'RECEIPT':
      return { className: QTY_EMERALD, note: 'Received In', noteClassName: QTY_NOTE_EMERALD }
    case 'DELIVERY':
      return { className: QTY_ROSE, note: 'Dispatched Out', noteClassName: QTY_NOTE_SLATE }
    case 'ADJUSTMENT':
      return isOutgoing(entry)
        ? { className: QTY_ROSE, note: 'Count correction (−)', noteClassName: QTY_NOTE_SLATE }
        : { className: QTY_EMERALD, note: 'Count correction (+)', noteClassName: QTY_NOTE_EMERALD }
  }
}

export function LedgerRow({ entry, isSelected, onInspect }: LedgerRowProps) {
  const navigate = useNavigate()
  const badge = MOVEMENT_BADGES[entry.movementType]
  const qty = quantityStyle(entry)
  const balance = balanceChange(entry)
  const ownPlace: LedgerPlace = entry.location

  function handleInspectClick(event: MouseEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
    onInspect(entry)
  }

  function openDocument(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    event.stopPropagation()
    navigate(documentPath(entry))
  }

  function renderFlow() {
    if (entry.movementType === 'ADJUSTMENT') {
      return (
        <div className="text-xs">
          <span className="font-medium text-slate-800">{entry.warehouse.name} <span className="text-slate-400 font-normal">{ownPlace.code}</span></span>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5">{balance ? `Balance: ${balance}` : ownPlace.name}</div>
        </div>
      )
    }
    const outgoing = isOutgoing(entry)
    const from = entry.sourceLocation ?? (entry.movementType === 'RECEIPT' ? null : ownPlace)
    const to = entry.destinationLocation ?? (entry.movementType === 'DELIVERY' ? null : ownPlace)
    const isTransfer = entry.movementType === 'INTERNAL_TRANSFER'
    return (
      <div className="flex items-center gap-1.5 text-xs">
        {from ? <PlaceLabel highlight={isTransfer && outgoing} place={from} /> : <span className={POINT_MUTED}>Inbound Receipt</span>}
        <span className={isTransfer ? 'material-symbols-outlined text-[13px] text-indigo-600' : 'material-symbols-outlined text-[13px] text-slate-400'}>arrow_forward</span>
        {to ? <PlaceLabel highlight={isTransfer && !outgoing} place={to} /> : <span className={POINT_MUTED}>Outbound Delivery</span>}
      </div>
    )
  }

  return (
    <tr className={isSelected ? 'hover:bg-indigo-50/40 bg-indigo-50/20 transition-colors cursor-pointer group' : 'hover:bg-slate-50/80 transition-colors cursor-pointer'} onClick={() => onInspect(entry)}>
      <td className="py-3.5 px-4 whitespace-nowrap">
        <div className="font-mono font-medium text-slate-900">{formatDateTime(entry.createdAt)}</div>
        <div className="font-mono text-[10px] text-slate-400">Entry: {entryLabel(entry)}</div>
      </td>
      <td className="py-3.5 px-4 whitespace-nowrap">
        <a className="font-mono font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1" href="#" onClick={openDocument} title="Open source document">
          {entry.reference}
          <span className="material-symbols-outlined text-[13px]">arrow_outward</span>
        </a>
        <div className="text-[11px] text-slate-400 font-mono">{DIRECTION_LABEL[entry.direction]} · {entry.warehouse.code}</div>
      </td>
      <td className="py-3.5 px-4 whitespace-nowrap">
        <span className={badge.className}>
          <span className="material-symbols-outlined text-[13px]">{badge.icon}</span>
          {badge.label}
        </span>
      </td>
      <td className="py-3.5 px-4">
        <div className="font-semibold text-slate-900">{entry.product.name}</div>
        <div className="font-mono text-[11px] text-slate-500">SKU: {entry.product.sku} · {entry.product.unitOfMeasure}</div>
      </td>
      <td className="py-3.5 px-4 whitespace-nowrap text-right">
        <span className={qty.className}>
          {signedQty(entry)}
        </span>
        <div className={qty.noteClassName}>{qty.note}</div>
      </td>
      <td className="py-3.5 px-4">
        {renderFlow()}
        <div className="text-[11px] text-slate-400 mt-0.5">
          {entry.movementType === 'ADJUSTMENT' ? `By ${entry.performedBy.name}` : balance ? `${ownPlace.code} balance: ${balance}` : `By ${entry.performedBy.name}`}
        </div>
      </td>
      <td className="py-3.5 px-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button className={isSelected ? 'p-1 rounded text-indigo-600 hover:bg-indigo-100 transition-colors' : 'p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors'} onClick={handleInspectClick} title="Inspect Record" type="button">
            <span className="material-symbols-outlined text-[17px]">visibility</span>
          </button>
          <a className="text-indigo-600 hover:underline font-medium text-[11px]" href="#" onClick={handleInspectClick}>Inspect</a>
        </div>
      </td>
    </tr>
  )
}
