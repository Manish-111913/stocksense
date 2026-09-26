export function DashboardFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-8 bg-surface-container-lowest/95 backdrop-blur-md px-space-xl z-30 flex items-center justify-between shadow-[0_-1px_4px_rgba(0,0,0,0.02)] border-t border-surface-container">
      <div className="flex items-center gap-space-base">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-[14px] text-secondary-container">cloud_done</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">Synced: Bengaluru Central Hub</span>
        </div>
        <span className="text-outline-variant font-label-sm">•</span>
        <span className="font-metric-tabular-sm text-metric-tabular-sm text-on-surface-variant">Active SKUs: 14,280</span>
      </div>
      <div className="flex items-center gap-space-base">
        <span className="font-metric-tabular-sm text-metric-tabular-sm text-on-surface-variant">Latency: 24ms</span>
        <div className="flex items-center gap-space-xxs">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <span className="font-label-sm text-label-sm text-on-surface-variant">Operational</span>
        </div>
      </div>
    </footer>
  )
}
