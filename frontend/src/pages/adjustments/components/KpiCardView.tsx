import { KPI_CARD, KPI_CARD_ELEVATED, type AdjustmentStatus, type KpiCard } from '../data.ts'

interface KpiCardViewProps {
  card: KpiCard
  onSelect: (status: AdjustmentStatus) => void
}

export function KpiCardView({ card, onSelect }: KpiCardViewProps) {
  return (
    <div className={card.elevated ? KPI_CARD_ELEVATED : KPI_CARD} onClick={() => onSelect(card.status)}>
      {card.elevated && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />}
      <div className="flex items-center justify-between text-slate-500">
        <span className={card.labelClass}>
          {card.elevated && <span className="material-symbols-outlined text-[15px] text-indigo-600">check_circle</span>}
          {card.label}
        </span>
        <span className={card.badgeClass}>{card.badge}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={card.countClass}>{card.count}</span>
        <span className="text-xs text-slate-500 font-normal">{card.unit}</span>
      </div>
      <div className={card.captionClass}>{card.caption}</div>
    </div>
  )
}
