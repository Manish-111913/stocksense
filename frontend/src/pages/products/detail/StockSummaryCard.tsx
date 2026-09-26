import { useNavigate } from 'react-router'
import type { Product, StockStatus } from '../../../api/types.ts'
import { ROUTES } from '../../../routes.ts'
import { formatQty, plural } from '../productsData.ts'

const MOVEMENT_ACTIONS: { label: string; icon: string; iconTone: string; hoverTone: string; to: string }[] = [
  { label: 'Receive Stock', icon: 'arrow_downward', iconTone: 'bg-emerald-50 text-emerald-600', hoverTone: 'group-hover:bg-emerald-100', to: ROUTES.receiptNew },
  { label: 'Deliver Stock', icon: 'arrow_upward', iconTone: 'bg-blue-50 text-blue-600', hoverTone: 'group-hover:bg-blue-100', to: ROUTES.deliveries },
  { label: 'Transfer Stock', icon: 'sync_alt', iconTone: 'bg-indigo-50 text-indigo-600', hoverTone: 'group-hover:bg-indigo-100', to: ROUTES.transfers },
  { label: 'Adjust Stock', icon: 'tune', iconTone: 'bg-amber-50 text-amber-600', hoverTone: 'group-hover:bg-amber-100', to: ROUTES.adjustments },
]

const STATUS_ICON: Record<StockStatus, { icon: string; tile: string }> = {
  IN_STOCK: { icon: 'check_circle', tile: 'w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center' },
  LOW_STOCK: { icon: 'warning', tile: 'w-12 h-12 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center' },
  OUT_OF_STOCK: { icon: 'block', tile: 'w-12 h-12 rounded-xl bg-rose-100/70 text-rose-700 flex items-center justify-center' },
}

// Right column: read-only stock balance, per-location breakdown and movement shortcuts
export function StockSummaryCard({ product }: { product: Product }) {
  const navigate = useNavigate()
  const { stock, unitOfMeasure: uom } = product
  const statusIcon = STATUS_ICON[stock.stockStatus]

  return (
    <div className="lg:col-span-5 space-y-6">
      {/* Current Stock Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[17px]">inventory_2</span>
            </span>
            <h2 className="text-sm font-bold text-slate-900">Current Stock Summary</h2>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-200/70 text-slate-600">Read-Only</span>
        </div>
        <div className="p-5 space-y-5">
          {/* Big Prominent Metric */}
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 p-4 rounded-xl border border-slate-200/70 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Available Balance</span>
              <div className="text-3xl font-extrabold font-mono text-slate-900 mt-1 flex items-baseline gap-1.5">
                <span>{formatQty(stock.onHand)}</span>
                <span className="text-base font-semibold text-slate-500 font-sans">{uom}</span>
              </div>
            </div>
            <div className={statusIcon.tile}>
              <span className="material-symbols-outlined text-2xl">{statusIcon.icon}</span>
            </div>
          </div>
          {/* Location Breakdown Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Location Breakdown</span>
              <span className="text-[11px] text-slate-500 font-medium">{plural(stock.locationCount, 'Location')}</span>
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/30 text-xs">
              {stock.locations.length === 0 ? (
                <div className="p-5 text-center">
                  <span className="material-symbols-outlined text-[22px] text-slate-400">inventory</span>
                  <p className="font-semibold text-slate-700 mt-1">No stock recorded yet</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Stock is added through receipts, transfers and adjustments.</p>
                </div>
              ) : (
                stock.locations.map((location) => (
                  <div className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors" key={location.locationId}>
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-slate-400">warehouse</span>
                        {location.warehouseName}
                      </div>
                      <span className="text-[10px] text-slate-400">{`${location.locationName} · ${location.locationCode}`}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900">{`${formatQty(location.quantity)} ${uom}`}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* Quick Workflow Operations Action Bar */}
          <div className="pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Initiate Legitimate Movement</span>
            <div className="grid grid-cols-2 gap-2">
              {MOVEMENT_ACTIONS.map((action) => (
                <button
                  className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-2 shadow-xs transition-all hover:border-indigo-300 group"
                  key={action.label}
                  onClick={() => navigate(action.to)}
                >
                  <span className={`w-6 h-6 rounded-lg ${action.iconTone} flex items-center justify-center ${action.hoverTone}`}>
                    <span className="material-symbols-outlined text-[15px]">{action.icon}</span>
                  </span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
