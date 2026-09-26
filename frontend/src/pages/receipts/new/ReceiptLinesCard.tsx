import { type ChangeEvent } from 'react'
import type { Product } from '../../../api/types.ts'
import { parseQty, type ReceiptLine } from './data.ts'

const QTY_INPUT = 'w-24 text-right font-mono text-xs px-2.5 py-1.5 bg-slate-50 border rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 line-qty-input'

interface ReceiptLinesCardProps {
  lines: ReceiptLine[]
  /** Only DRAFT / WAITING receipts are editable: otherwise quantities are read-only and lines can't change */
  isLocked: boolean
  /** Active catalog products offered by the quick-add select */
  products: Product[]
  productsState: 'loading' | 'ready' | 'error'
  productSearch: string
  onProductSearchChange: (value: string) => void
  onRetryProducts: () => void
  onQuickAdd: (productId: string) => void
  onQtyChange: (productId: string, qty: string) => void
  onRemove: (productId: string) => void
  onCreateProduct: () => void
}

// Card B: products line items section
export function ReceiptLinesCard({ lines, isLocked, products, productsState, productSearch, onProductSearchChange, onRetryProducts, onQuickAdd, onQtyChange, onRemove, onCreateProduct }: ReceiptLinesCardProps) {
  function handleQuickSelect(event: ChangeEvent<HTMLSelectElement>) {
    if (event.target.value) onQuickAdd(event.target.value)
  }

  const catalogEmpty = productsState === 'ready' && products.length === 0 && !productSearch.trim()
  const placeholder =
    productsState === 'loading' && products.length === 0
      ? 'Loading products...'
      : productsState === 'error'
        ? 'Could not load products'
        : products.length === 0
          ? productSearch.trim()
            ? 'No matching products'
            : 'No active products yet'
          : '+ Add Product from Catalog'
  const emptyText = isLocked
    ? 'This receipt has no product lines.'
    : catalogEmpty
      ? 'No active products in the catalog yet. Create a product first, then add it here.'
      : 'No products added yet. Use "+ Add Product from Catalog" to add a line.'

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
        {!isLocked && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-2 top-1.5 text-slate-400 text-[16px]">search</span>
              <input
                aria-label="Search products"
                className="w-32 pl-7 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                onChange={(e) => onProductSearchChange(e.target.value)}
                placeholder="Search..."
                type="search"
                value={productSearch}
              />
            </div>
            <div className="relative">
              <select
                className="appearance-none bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs py-1.5 pl-3 pr-8 rounded-lg font-semibold hover:bg-indigo-100 transition-colors cursor-pointer max-w-[220px] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={products.length === 0}
                id="productQuickSelect"
                onChange={handleQuickSelect}
                value=""
              >
                <option value="">{placeholder}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {`${product.name} (${product.sku})`}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2 text-indigo-600 text-base">expand_more</span>
            </div>
          </div>
        )}
      </div>
      {!isLocked && productsState === 'error' && (
        <p className="px-6 pt-3 text-[11px] text-rose-500 flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">error</span> Could not load the product catalog.
          <button className="font-semibold underline hover:text-rose-700" onClick={onRetryProducts} type="button">
            Retry
          </button>
        </p>
      )}
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
            {lines.length === 0 && (
              <tr>
                <td className="py-8 px-5 text-center text-slate-400" colSpan={5}>
                  {emptyText}
                </td>
              </tr>
            )}
            {lines.map((line) => (
              <tr className="hover:bg-slate-50/60 transition-colors" data-sku={line.sku} key={line.productId}>
                <td className="py-3 px-5">
                  <div className="font-semibold text-slate-900">{line.name}</div>
                </td>
                <td className="py-3 px-4 font-mono font-medium text-slate-700">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100">{line.sku}</span>
                </td>
                <td className="py-3 px-4 text-slate-600 font-medium">{line.unit}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <input
                      aria-label={`Received quantity of ${line.sku}`}
                      className={`${QTY_INPUT} ${!isLocked && parseQty(line.qty) === null ? 'border-rose-300' : 'border-slate-200'}`}
                      min="0"
                      onChange={(e) => onQtyChange(line.productId, e.target.value)}
                      readOnly={isLocked}
                      step="any"
                      type="number"
                      value={line.qty}
                    />
                    <span className="text-[11px] font-mono text-slate-400">{line.unit}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  {!isLocked && (
                    <button className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" onClick={() => onRemove(line.productId)} title="Remove Line" type="button">
                      <span className="material-symbols-outlined text-[17px]">delete</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isLocked && (
        <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs">
          <button className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-indigo-700 font-semibold flex items-center gap-1.5 transition-all" onClick={onCreateProduct} type="button">
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>New Product</span>
          </button>
          <span className="text-[11px] text-slate-400">Received quantity must be greater than 0 (up to 3 decimals).</span>
        </div>
      )}
    </div>
  )
}
