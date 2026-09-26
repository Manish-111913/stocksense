import { useNavigate } from 'react-router'
import { useToast } from '../../../context/toast.ts'
import { ROUTES } from '../../../routes.ts'
import { LOCATION_ROWS, LOCATION_TONES, MOVEMENT_ACTIONS, type MovementAction } from './data.ts'

// Right column: read-only stock balance, per-location breakdown and movement shortcuts
export function StockSummaryCard() {
  const navigate = useNavigate()
  const { showModuleAlert } = useToast()

  function handleMovement(action: MovementAction) {
    if (action.module) showModuleAlert(action.module)
    else navigate(ROUTES.receiptNew)
  }

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
                <span>500</span>
                <span className="text-base font-semibold text-slate-500 font-sans">KG</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
          </div>
          {/* Location Breakdown Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Location Breakdown</span>
              <span className="text-[11px] text-slate-500 font-medium">3 Warehousing Nodes</span>
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/30 text-xs">
              {LOCATION_ROWS.map((hub) => {
                const tone = LOCATION_TONES[hub.tone]
                return (
                  <div className={tone.row} key={hub.name}>
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className={tone.icon}>{hub.icon}</span>
                        {hub.name}
                      </div>
                      <span className={tone.detail}>{hub.detail}</span>
                    </div>
                    <div className="text-right">
                      <div className={tone.qty}>{hub.qty}</div>
                      <span className={tone.status}>
                        <span className={tone.dot} />
                        {hub.status}
                      </span>
                    </div>
                  </div>
                )
              })}
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
                  onClick={() => handleMovement(action)}
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
