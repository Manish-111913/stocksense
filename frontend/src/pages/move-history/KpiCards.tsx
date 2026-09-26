import type { LedgerSummary } from '../../api/types.ts'
import { formatQty } from '../products/productsData.ts'

interface KpiCardsProps {
  /** Summary for the active filters (null while loading or when it failed) */
  summary: LedgerSummary | null
}

// 5 KPI cards row: ledger entry counts from /ledger/summary
export function KpiCards({ summary }: KpiCardsProps) {
  const count = (value: number | undefined) => (value === undefined ? '—' : formatQty(value))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-5">
      {/* KPI 1 */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Movements</span>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">layers</span>
          </div>
        </div>
        <div>
          <div className="text-2xl font-mono font-bold text-slate-900 tracking-tight">{count(summary?.totalMovements)}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Matching active filters
          </div>
        </div>
      </div>
      {/* KPI 2 */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Stock Received</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
          </div>
        </div>
        <div>
          <div className="text-2xl font-mono font-bold text-emerald-600 tracking-tight">{count(summary?.byMovementType.RECEIPT)} <span className="text-xs font-sans font-normal text-slate-500">entries</span></div>
          <div className="text-xs text-slate-500 mt-1">From validated receipts</div>
        </div>
      </div>
      {/* KPI 3 */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Stock Delivered</span>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">local_shipping</span>
          </div>
        </div>
        <div>
          <div className="text-2xl font-mono font-bold text-rose-500 tracking-tight">{count(summary?.byMovementType.DELIVERY)} <span className="text-xs font-sans font-normal text-slate-500">entries</span></div>
          <div className="text-xs text-slate-500 mt-1">From validated deliveries</div>
        </div>
      </div>
      {/* KPI 4: Highlighted Transfer Card with Indigo Accent Border */}
      <div className="bg-gradient-to-b from-indigo-50/50 to-white rounded-xl p-4 border-2 border-indigo-500 shadow-sm relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Internal Transfers</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            Balanced Flow
          </span>
        </div>
        <div>
          <div className="text-2xl font-mono font-bold text-indigo-600 tracking-tight">{count(summary?.byMovementType.INTERNAL_TRANSFER)} <span className="text-xs font-sans font-normal text-slate-500">entries</span></div>
          <div className="text-xs text-indigo-900/70 font-medium mt-1">OUT at source + IN at destination</div>
        </div>
      </div>
      {/* KPI 5 */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Adjustments</span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200">
            Read-only
          </span>
        </div>
        <div>
          <div className="text-2xl font-mono font-bold text-slate-800 tracking-tight">{count(summary?.byMovementType.ADJUSTMENT)} <span className="text-xs font-sans font-normal text-slate-500">entries</span></div>
          <div className="text-xs text-slate-500 mt-1">Physical count corrections</div>
        </div>
      </div>
    </div>
  )
}
