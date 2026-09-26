import { type MouseEvent, useEffect } from 'react'
import { useNavigate } from 'react-router'
import type { LedgerEntry, LedgerPlace } from '../../api/types.ts'
import { formatQty } from '../products/productsData.ts'
import { balanceChange, DIRECTION_LABEL, documentPath, entryLabel, formatDateTime, isOutgoing, MOVEMENT_BADGES, signedQty } from './data.ts'

interface InspectorDrawerProps {
  entry: LedgerEntry | null
  isOpen: boolean
  onClose: () => void
}

// Fixed right-side panel over the page (the ledger table keeps its full width)
const DRAWER = 'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 p-5 flex flex-col gap-4 overflow-y-auto ss-drawer-in'

const ACTION_TEXT: Record<LedgerEntry['movementType'], string> = {
  RECEIPT: 'validated',
  DELIVERY: 'validated',
  INTERNAL_TRANSFER: 'validated',
  ADJUSTMENT: 'applied',
}

interface FlowSide {
  place: LedgerPlace | null
  /** Shown instead of a location when stock came from / went outside the company */
  fallback: string
  qty: string | null
}

function FlowSideRow({ side, role, icon }: { side: FlowSide; role: 'Source' | 'Destination'; icon: string }) {
  const isSource = role === 'Source'
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600">
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-900">{side.place ? side.place.name : side.fallback}</div>
          <div className={isSource ? 'text-[11px] font-mono text-indigo-600' : 'text-[11px] font-mono text-emerald-600'}>
            {side.place ? `${role}: ${side.place.code}` : `${role}: outside stock`}
          </div>
        </div>
      </div>
      {side.qty && (
        <span className={isSource ? 'px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-mono text-xs font-semibold' : 'px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-mono text-xs font-semibold'}>{side.qty}</span>
      )}
    </div>
  )
}

// Right slide-over / inspection panel for the selected ledger entry
export function InspectorDrawer({ entry, isOpen, onClose }: InspectorDrawerProps) {
  const navigate = useNavigate()
  // Escape closes the panel
  useEffect(() => {
    if (!isOpen || !entry) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, entry, onClose])
  if (!entry) return <div className={`${DRAWER} hidden`} id="inspectorDrawer" />

  const badge = MOVEMENT_BADGES[entry.movementType]
  const outgoing = isOutgoing(entry)
  const unit = entry.product.unitOfMeasure
  const amount = `${formatQty(entry.quantity)} ${unit}`
  const balance = balanceChange(entry)

  // Source / destination: transfers carry both; receipts and adjustments (+) only add, deliveries and adjustments (−) only remove
  const source: FlowSide = {
    place: entry.sourceLocation ?? (outgoing ? entry.location : null),
    fallback: entry.movementType === 'ADJUSTMENT' ? 'Physical count correction' : 'Inbound receipt',
    qty: entry.sourceLocation || outgoing ? `−${amount}` : null,
  }
  const destination: FlowSide = {
    place: entry.destinationLocation ?? (outgoing ? null : entry.location),
    fallback: entry.movementType === 'ADJUSTMENT' ? 'Physical count correction' : 'Outbound delivery',
    qty: entry.destinationLocation || !outgoing ? `+${amount}` : null,
  }

  function openDocument(event?: MouseEvent<HTMLElement>) {
    event?.preventDefault()
    if (entry) navigate(documentPath(entry))
  }

  return (
    <div className={isOpen ? DRAWER : `${DRAWER} hidden`} id="inspectorDrawer">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-indigo-600">receipt_long</span>
            <h3 className="text-base font-mono font-bold text-slate-900">{entry.reference}</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
              Posted
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Ledger Entry {entryLabel(entry)} · {badge.label}</div>
        </div>
        <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={onClose} title="Close Panel" type="button">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      {/* Current Audit State */}
      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[15px]">check</span>
        </div>
        <div>
          <div className="text-xs font-bold text-emerald-900">Committed to Ledger</div>
          <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
            Written when {entry.reference} was {ACTION_TEXT[entry.movementType]}. The ledger is append-only: entries can&apos;t be edited or deleted.
          </p>
        </div>
      </div>
      {/* Movement Flow Path Visual Diagram */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Movement Flow Path</span>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
          <FlowSideRow icon="warehouse" role="Source" side={source} />
          {/* Transit Indicator */}
          <div className="flex items-center justify-center relative py-1">
            <div className="w-full h-px bg-slate-200" />
            <div className="absolute px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-semibold flex items-center gap-1 shadow-2xs">
              <span className="material-symbols-outlined text-[13px]">{badge.icon}</span>
              {badge.label}
            </div>
          </div>
          <FlowSideRow icon="domain" role="Destination" side={destination} />
        </div>
      </div>
      {/* Items & Quantity Delta */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Items &amp; Quantity Delta</span>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">{entry.product.name}</span>
            <span className={outgoing ? 'text-sm font-mono font-bold text-rose-600' : 'text-sm font-mono font-bold text-emerald-600'}>{signedQty(entry)}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            SKU: {entry.product.sku} · {unit} · <span className="text-indigo-600 font-semibold">Impact: {DIRECTION_LABEL[entry.direction]} at {entry.location.code}</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>Location balance ({entry.location.code})</span>
            <span className="font-mono font-semibold text-slate-900">{balance ?? 'Not recorded'}</span>
          </div>
        </div>
      </div>
      {/* Audit Details */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Audit Details</span>
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Ledger Type</span>
            <span className="font-medium text-slate-900">{badge.label} · {DIRECTION_LABEL[entry.direction]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Performed By</span>
            <span className="font-medium text-slate-900 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-indigo-600">person</span>
              {entry.performedBy.name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Timestamp</span>
            <span className="font-mono text-slate-900">{formatDateTime(entry.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Warehouse / Location</span>
            <span className="font-medium text-slate-900 text-right">{entry.warehouse.name} · {entry.location.name} ({entry.location.code})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Source Document</span>
            <a className="font-mono font-semibold text-indigo-600 hover:underline" href="#" onClick={openDocument}>{entry.reference}</a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Immutability Status</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-medium">
              <span className="material-symbols-outlined text-[13px] text-slate-400">lock</span>
              Read-Only Locked
            </span>
          </div>
        </div>
      </div>
      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button className="flex-1 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors" onClick={onClose} type="button">
          Close
        </button>
        <button className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm" onClick={() => openDocument()} type="button">
          <span>View Related Document</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}
