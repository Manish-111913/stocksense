import { type ChangeEvent } from 'react'
import { CATALOG, catalogOptionValue, type ReceiptLine } from './data.ts'

interface ReceiptLinesCardProps {
  lines: ReceiptLine[]
  /** Validated receipts are immutable: quantities become read-only */
  isLocked: boolean
  onQuickAdd: (optionValue: string) => void
  onQtyChange: (sku: string, qty: string) => void
  onRemove: (sku: string) => void
  onAddCustom: () => void
}

// Card B: products line items section
export function ReceiptLinesCard({ lines, isLocked, onQuickAdd, onQtyChange, onRemove, onAddCustom }: ReceiptLinesCardProps) {
  function handleQuickSelect(event: ChangeEvent<HTMLSelectElement>) {
    if (event.target.value) onQuickAdd(event.target.value)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">inventory_2</span>
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Products &amp; Quantities</h2>
            <p className="text-[11px] text-slate-400">Add product line items and specify verified received units.</p>
          </div>
        </div>
        {/* Line Item Quick Adder Dropdown (always resets to the placeholder option) */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              className="appearance-none bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs py-1.5 pl-3 pr-8 rounded-lg font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
              id="productQuickSelect"
              onChange={handleQuickSelect}
              value=""
            >
              <option value="">+ Add Product from Catalog</option>
              {CATALOG.map((product) => (
                <option key={product.sku} value={catalogOptionValue(product)}>
                  {`${product.name} (${product.sku})`}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2 text-indigo-600 text-base">expand_more</span>
          </div>
        </div>
      </div>
      {/* Line items table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs" id="receiptLinesTable">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-5">Product</th>
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4">Unit</th>
              <th className="py-3 px-4 text-right" style={{ minWidth: '140px' }}>
                Received Quantity
              </th>
              <th className="py-3 px-4 text-center" style={{ width: '60px' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans" id="receiptLinesTbody">
            {lines.map((line) => (
              <tr className="hover:bg-slate-50/60 transition-colors" data-sku={line.sku} key={line.sku}>
                <td className="py-3 px-5">
                  <div className="font-semibold text-slate-900">{line.name}</div>
                  <div className="text-[10px] text-slate-400">{line.description}</div>
                </td>
                <td className="py-3 px-4 font-mono font-medium text-slate-700">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100">{line.sku}</span>
                </td>
                <td className="py-3 px-4 text-slate-600 font-medium">{line.unit}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <input
                      className="w-24 text-right font-mono text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 line-qty-input"
                      min="1"
                      onChange={(e) => onQtyChange(line.sku, e.target.value)}
                      readOnly={isLocked}
                      type="number"
                      value={line.qty}
                    />
                    <span className="text-[11px] font-mono text-slate-400">{line.unit}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <button className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" onClick={() => onRemove(line.sku)} title="Remove Line">
                    <span className="material-symbols-outlined text-[17px]">delete</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs">
        <button className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-indigo-700 font-semibold flex items-center gap-1.5 transition-all" onClick={onAddCustom}>
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>+ Add Custom Line</span>
        </button>
        <span className="text-[11px] text-slate-400">Strictly positive received quantity required per line.</span>
      </div>
    </div>
  )
}
