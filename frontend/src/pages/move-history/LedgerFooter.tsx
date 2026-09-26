// Bottom system telemetry status bar
export function LedgerFooter() {
  return (
    <footer className="h-7 bg-slate-100 border-t border-slate-200 px-4 flex items-center justify-between text-[11px] font-mono text-slate-500 z-30 shrink-0">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="hidden sm:inline">Synced: Bengaluru Central Hub · Active SKUs: 148 · Latency: 24ms · Operational Core · Automated Reorder: Active</span>
        <span className="sm:hidden">Synced: Bengaluru Central · Latency: 24ms</span>
      </div>
      <div className="flex items-center gap-3">
        <span>SSL 256-bit</span>
        <span>Node v18.19</span>
      </div>
    </footer>
  )
}
