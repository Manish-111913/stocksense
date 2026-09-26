// Full-width bottom section: Recent Stock Movements (Stock Ledger)
// The ledger API isn't built yet, so this shows the empty state until movements exist
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
            <p className="text-[11px] text-slate-400">Chronological stock transactions for SKU: {sku}</p>
          </div>
        </div>
      </div>
      <div className="py-12 px-6 text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
          <span className="material-symbols-outlined text-xl">history</span>
        </div>
        <p className="text-sm font-semibold text-slate-800">No stock movements yet</p>
        <p className="text-xs text-slate-500 mt-1">Receipts, deliveries, transfers and adjustments for this product will appear here.</p>
      </div>
      <div className="p-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Showing 0 transactional events</span>
        <span className="text-slate-400">All inventory movements are logged in the immutable stock ledger.</span>
      </div>
    </div>
  )
}
