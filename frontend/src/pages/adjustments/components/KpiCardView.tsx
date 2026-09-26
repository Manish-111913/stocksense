import { formatQty } from '../../products/productsData.ts'
import { KPI_CARD, KPI_CARD_ELEVATED, type KpiCard, type KpiKey } from '../data.ts'

interface KpiCardViewProps {
  card: KpiCard
  /** null while the summary is loading or unavailable */
  count: number | null
  isActive: boolean
  onSelect: (key: KpiKey) => void
}

export function KpiCardView({ card, count, isActive, onSelect }: KpiCardViewProps) {
  return (
    <div className={isActive ? KPI_CARD_ELEVATED : KPI_CARD} onClick={() => onSelect(card.key)}>
      {isActive && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />}
      <div className="flex items-center justify-between text-slate-500">
        <span className={isActive ? `${card.labelClass} flex items-center gap-1` : card.labelClass}>
          {isActive && <span className="material-symbols-outlined text-[15px] text-indigo-600">check_circle</span>}
          {card.label}
        </span>
        <span className={card.badgeClass}>{card.badge}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={isActive ? 'text-2xl font-bold font-mono text-indigo-700' : 'text-2xl font-bold font-mono text-slate-900'}>{count === null ? '—' : formatQty(count)}</span>
        <span className="text-xs text-slate-500 font-normal">{card.unit}</span>
      </div>
      <div className={isActive ? 'mt-2 text-xs text-indigo-900 font-medium truncate' : 'mt-2 text-xs text-slate-500 truncate'}>{card.caption}</div>
    </div>
  )
}
