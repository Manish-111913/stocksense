import type { DashboardSummary } from '../../api/types.ts'
import { formatQty } from '../products/productsData.ts'

export type SyncState = 'syncing' | 'online' | 'offline'

interface DashboardFooterProps {
  summary: DashboardSummary | null
  /** When the summary last loaded successfully */
  syncedAt: Date | null
  /** Round trip of the last summary request */
  latencyMs: number | null
  syncState: SyncState
}

const STATE_LABEL: Record<SyncState, string> = {
  syncing: 'Syncing',
  online: 'Operational',
  offline: 'Offline',
}

export function DashboardFooter({ summary, syncedAt, latencyMs, syncState }: DashboardFooterProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-8 bg-surface-container-lowest/95 backdrop-blur-md px-space-xl z-30 flex items-center justify-between shadow-[0_-1px_4px_rgba(0,0,0,0.02)] border-t border-surface-container">
      <div className="flex items-center gap-space-base">
        <div className="flex items-center gap-space-xs">
          <span className={syncState === 'offline' ? 'material-symbols-outlined text-[14px] text-error' : 'material-symbols-outlined text-[14px] text-secondary-container'}>{syncState === 'offline' ? 'cloud_off' : 'cloud_done'}</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">{syncedAt ? `Synced: ${syncedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : 'Not synced yet'}</span>
        </div>
        <span className="text-outline-variant font-label-sm">•</span>
        <span className="font-metric-tabular-sm text-metric-tabular-sm text-on-surface-variant">Products: {summary ? formatQty(summary.totalProducts) : '—'}</span>
      </div>
      <div className="flex items-center gap-space-base">
        <span className="font-metric-tabular-sm text-metric-tabular-sm text-on-surface-variant">Latency: {latencyMs === null ? '—' : `${latencyMs}ms`}</span>
        <div className="flex items-center gap-space-xxs">
          <span className={syncState === 'offline' ? 'w-1.5 h-1.5 rounded-full bg-error' : syncState === 'syncing' ? 'w-1.5 h-1.5 rounded-full bg-outline animate-pulse' : 'w-1.5 h-1.5 rounded-full bg-secondary'} />
          <span className="font-label-sm text-label-sm text-on-surface-variant">{STATE_LABEL[syncState]}</span>
        </div>
      </div>
    </footer>
  )
}
