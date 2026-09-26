import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { listLedger } from '../../../api/ledger.ts'
import type { LedgerDirection, LedgerEntry, MovementType, Paginated } from '../../../api/types.ts'
import { receiptPath, ROUTES } from '../../../routes.ts'
import { errorMessage, formatQty } from '../productsData.ts'

const LEDGER_LIMIT = 10
const TABLE_COLUMNS = 6

const MOVEMENT_BADGE: Record<MovementType, { className: string; icon: string; label: string }> = {
  RECEIPT: { className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-100', icon: 'move_to_inbox', label: 'Receipt' },
  DELIVERY: { className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold text-[11px] border border-rose-100', icon: 'local_shipping', label: 'Delivery' },
  INTERNAL_TRANSFER: { className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100', icon: 'sync_alt', label: 'Transfer' },
  ADJUSTMENT: { className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-[11px] border border-amber-200', icon: 'tune', label: 'Adjustment' },
}

const QTY_CLASS: Record<LedgerDirection, string> = {
  IN: 'font-mono font-bold text-emerald-600',
  ADJUSTMENT_IN: 'font-mono font-bold text-emerald-600',
  OUT: 'font-mono font-bold text-rose-600',
  ADJUSTMENT_OUT: 'font-mono font-bold text-rose-600',
  TRANSFER: 'font-mono font-bold text-indigo-600',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** "+10", "-4", or the plain magnitude for transfers (stock only changes place) */
function signedLabel(entry: LedgerEntry) {
  if (entry.direction === 'TRANSFER') return formatQty(entry.quantity)
  return `${entry.signedQuantity > 0 ? '+' : ''}${formatQty(entry.signedQuantity)}`
}

function placeLabel(entry: LedgerEntry) {
  if (entry.direction === 'TRANSFER' && entry.sourceLocation && entry.destinationLocation) return `${entry.sourceLocation.name} → ${entry.destinationLocation.name}`
  return `${entry.location.name} · ${entry.location.code}`
}

// Full-width bottom section: Recent Stock Movements (Stock Ledger) for one product
export function StockLedgerCard({ productId, sku }: { productId: string; sku: string }) {
  const navigate = useNavigate()
  const [reloadKey, setReloadKey] = useState(0)
  const [result, setResult] = useState<Paginated<LedgerEntry> | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  // Key of the last request that settled; anything else means a request is in flight
  const [settledKey, setSettledKey] = useState<string | null>(null)
  const requestKey = `${productId}|${reloadKey}`
  const isLoading = settledKey !== requestKey
  const loadError = isLoading ? null : fetchError

  useEffect(() => {
    let cancelled = false
    listLedger({ productId, page: 1, limit: LEDGER_LIMIT, sortOrder: 'desc' })
      .then((res) => {
        if (cancelled) return
        setResult(res)
        setFetchError(null)
        setSettledKey(requestKey)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setFetchError(errorMessage(err, 'Could not load stock movements. Please try again.'))
        setSettledKey(requestKey)
      })
    return () => {
      cancelled = true
    }
  }, [productId, requestKey])

  const rows = result?.data ?? []
  const total = result?.pagination.total ?? 0

  function renderBody() {
    if (loadError) {
      return (
        <tr>
          <td className="py-12 px-6 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">error</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">Couldn&apos;t load stock movements</p>
            <p className="text-xs text-slate-500 mt-1">{loadError}</p>
            <button className="mt-4 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs inline-flex items-center gap-1.5 transition-all" onClick={() => setReloadKey((key) => key + 1)}>
              <span className="material-symbols-outlined text-[16px] text-slate-500">refresh</span>
              <span>Retry</span>
            </button>
          </td>
        </tr>
      )
    }
    if (!result || (isLoading && rows.length === 0)) {
      return (
        <tr>
          <td className="py-12 px-6 text-center text-xs text-slate-500" colSpan={TABLE_COLUMNS}>
            <span className="material-symbols-outlined text-[22px] text-slate-400 animate-spin block mx-auto mb-2 w-fit">progress_activity</span>
            Loading stock movements...
          </td>
        </tr>
      )
    }
    if (rows.length === 0) {
      return (
        <tr>
          <td className="py-12 px-6 text-center" colSpan={TABLE_COLUMNS}>
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-xl">history</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">No stock movements yet</p>
            <p className="text-xs text-slate-500 mt-1">Receipts, deliveries, transfers and adjustments for this product will appear here.</p>
          </td>
        </tr>
      )
    }
    return rows.map((entry) => {
      const badge = MOVEMENT_BADGE[entry.movementType]
      const uom = entry.product.unitOfMeasure
      return (
        <tr className="hover:bg-slate-50/60 transition-colors" key={entry.id}>
          <td className="py-3 px-4 font-mono text-[11px] text-slate-700 whitespace-nowrap">{formatDateTime(entry.createdAt)}</td>
          <td className="py-3 px-4">
            {entry.referenceType === 'RECEIPT' ? (
              <button className="font-mono font-bold text-indigo-600 hover:text-indigo-800 transition-colors" onClick={() => navigate(receiptPath(entry.referenceId))}>
                {entry.reference}
              </button>
            ) : (
              <span className="font-mono font-bold text-slate-800">{entry.reference}</span>
            )}
          </td>
          <td className="py-3 px-4">
            <span className={badge.className}>
              <span className="material-symbols-outlined text-[13px]">{badge.icon}</span>
              {badge.label}
            </span>
          </td>
          <td className="py-3 px-4">
            <div className="font-semibold text-slate-800">{entry.warehouse.name}</div>
            <div className="text-[10px] text-slate-400">{placeLabel(entry)}</div>
          </td>
          <td className="py-3 px-4 text-right whitespace-nowrap">
            <span className={QTY_CLASS[entry.direction]}>{`${signedLabel(entry)} ${uom}`}</span>
            {entry.quantityBefore !== null && entry.quantityAfter !== null && <span className="block text-[10px] text-slate-400 font-mono">{`${formatQty(entry.quantityBefore)} → ${formatQty(entry.quantityAfter)}`}</span>}
          </td>
          <td className="py-3 px-4 text-slate-600">{entry.performedBy.name}</td>
        </tr>
      )
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Stock Movements · Stock Ledger</h2>
            <p className="text-[11px] text-slate-400">Chronological stock transactions for SKU: {sku}</p>
          </div>
        </div>
        <button className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all w-fit" onClick={() => navigate(ROUTES.moveHistory)}>
          <span className="material-symbols-outlined text-[16px] text-slate-500">history</span>
          <span>Move History</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4" scope="col">Date</th>
              <th className="py-3 px-4" scope="col">Reference</th>
              <th className="py-3 px-4" scope="col">Movement</th>
              <th className="py-3 px-4" scope="col">Location</th>
              <th className="py-3 px-4 text-right" scope="col">Quantity</th>
              <th className="py-3 px-4" scope="col">Performed By</th>
            </tr>
          </thead>
          <tbody className={isLoading && rows.length > 0 ? 'divide-y divide-slate-100 opacity-60 transition-opacity' : 'divide-y divide-slate-100'}>{renderBody()}</tbody>
        </table>
      </div>
      <div className="p-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>{result ? `Showing ${rows.length} of ${formatQty(total)} transactional ${total === 1 ? 'event' : 'events'}` : 'Loading transactional events...'}</span>
        <span className="text-slate-400">All inventory movements are logged in the immutable stock ledger.</span>
      </div>
    </div>
  )
}
