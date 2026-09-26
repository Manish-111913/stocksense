import { LEDGER_ROWS } from './data.ts'

// Full-width bottom section: Recent Stock Movements (Immutable Stock Ledger)
export function StockLedgerCard({ sku }: { sku: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Stock Movements · Stock Ledger</h2>
            <p className="text-[11px] text-slate-400">Cryptographically logged chronological transactions for SKU: {sku}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Immutable Chain Verified
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-5">Timestamp</th>
              <th className="py-3 px-5">Movement Type &amp; Ref</th>
              <th className="py-3 px-5 text-right">Quantity</th>
              <th className="py-3 px-5">Source → Destination</th>
              <th className="py-3 px-5">Status</th>
              <th className="py-3 px-5 text-right">Performed By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {LEDGER_ROWS.map((row) => (
              <tr className="hover:bg-slate-50/60 transition-colors" key={row.reference}>
                <td className="py-3.5 px-5 text-slate-600 font-mono text-[11px]">{row.timestamp}</td>
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-md ${row.iconTone} flex items-center justify-center flex-shrink-0`}>
                      <span className="material-symbols-outlined text-[14px]">{row.icon}</span>
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">{row.type}</div>
                      <div className="font-mono text-[10px] text-slate-400">{row.reference}</div>
                    </div>
                  </div>
                </td>
                <td className={`py-3.5 px-5 text-right font-mono ${row.qtyTone}`}>{row.qty}</td>
                <td className="py-3.5 px-5 text-slate-700">{row.route}</td>
                <td className="py-3.5 px-5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${row.statusTone}`}>{row.status}</span>
                </td>
                <td className="py-3.5 px-5 text-right text-slate-600 font-medium">{row.performedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Showing latest 4 transactional events</span>
        <span className="text-slate-400">All inventory movements are cryptographically logged in the immutable stock ledger.</span>
      </div>
    </div>
  )
}
