import { DOCUMENT_STATUS_LABEL, type DocumentStatus } from '../../../api/types.ts'
import { formatQty } from '../../products/productsData.ts'
import { KPI_CARD_ACTIVE, KPI_CARD_INACTIVE, type KpiCard as KpiCardData } from '../data.ts'

interface KpiCardProps {
  card: KpiCardData
  /** null while the summary is loading (or failed) */
  count: number | null
  /** This status is the current list filter */
  active: boolean
  onSelect: (status: DocumentStatus) => void
}

export function KpiCard({ card, count, active, onSelect }: KpiCardProps) {
  return (
    <div className={active ? KPI_CARD_ACTIVE : KPI_CARD_INACTIVE} onClick={() => onSelect(card.status)}>
      {active && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />}
      <div className="flex items-center justify-between text-slate-500">
        <span className={card.labelClass}>
          {active && (
            <span className="material-symbols-outlined text-[15px] text-indigo-600" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          )}
          {DOCUMENT_STATUS_LABEL[card.status]}
        </span>
        <span className={card.badgeClass}>{card.badge}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={card.countClass}>{count === null ? '—' : formatQty(count)}</span>
        <span className="text-xs text-slate-500 font-normal">{card.unit}</span>
      </div>
      <div className={card.captionClass}>{card.caption}</div>
    </div>
  )
}
