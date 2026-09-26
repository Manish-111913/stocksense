import { KPI_CARD_ACTIVE, KPI_CARD_INACTIVE, type KpiCard as KpiCardData, type TransferStatus } from '../data.ts'

interface KpiCardProps {
  card: KpiCardData
  onSelect: (status: TransferStatus) => void
}

export function KpiCard({ card, onSelect }: KpiCardProps) {
  return (
    <div className={card.active ? KPI_CARD_ACTIVE : KPI_CARD_INACTIVE} onClick={() => onSelect(card.status)}>
      {card.active && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />}
      <div className="flex items-center justify-between text-slate-500">
        <span className={card.labelClass}>
          {card.active && (
            <span className="material-symbols-outlined text-[15px] text-indigo-600" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          )}
          {card.status}
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
