import { useUserBadge } from '../../auth/useAuth.ts'
import { formatQty } from '../products/productsData.ts'
import { formatDateTime } from './data.ts'

interface LedgerFooterProps {
  /** All ledger movements (no filters); null while loading or unavailable */
  totalMovements: number | null
  /** createdAt of the newest movement, if any */
  latestAt: string | null
}

// Bottom status bar: real ledger totals + signed-in user
export function LedgerFooter({ totalMovements, latestAt }: LedgerFooterProps) {
  const { name, roleLabel } = useUserBadge()
  const total = totalMovements === null ? '—' : formatQty(totalMovements)
  const latest = latestAt ? formatDateTime(latestAt) : 'none yet'

  return (
    <footer className="h-7 bg-slate-100 border-t border-slate-200 px-4 flex items-center justify-between text-[11px] font-mono text-slate-500 z-30 shrink-0">
      <div className="flex items-center gap-2">
        <span className={totalMovements === null ? 'w-1.5 h-1.5 rounded-full bg-slate-400' : 'w-1.5 h-1.5 rounded-full bg-emerald-500'} />
        <span className="hidden sm:inline">Stock Ledger · Movements recorded: {total} · Latest movement: {latest} · Read-only</span>
        <span className="sm:hidden">Movements: {total}</span>
      </div>
      <div className="flex items-center gap-3">
        <span>{name}</span>
        <span>{roleLabel}</span>
      </div>
    </footer>
  )
}
