import { type MouseEvent } from 'react'
import { type HubStock, type ProductRow, type RowAction, type StockStatus, type StockTone } from '../productsData.ts'

const STATUS_BADGE: Record<StockStatus, { badge: string; dot: string }> = {
  'In Stock': {
    badge: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    dot: 'w-1.5 h-1.5 rounded-full bg-emerald-500',
  },
  'Low Stock': {
    badge: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60',
    dot: 'w-1.5 h-1.5 rounded-full bg-amber-500',
  },
  'Out of Stock': {
    badge: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60',
    dot: 'w-1.5 h-1.5 rounded-full bg-rose-500',
  },
}

const STOCK_TONE: Record<StockTone, { button: string; hubs: string; min: string }> = {
  normal: {
    button: 'inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200/70 text-slate-700 font-mono font-medium transition-colors',
    hubs: 'text-[10px] text-slate-500',
    min: 'font-medium text-slate-700',
  },
  low: {
    button: 'inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 hover:bg-amber-100/70 text-amber-800 font-mono font-medium transition-colors',
    hubs: 'text-[10px] text-amber-600',
    min: 'font-medium text-amber-700',
  },
  out: {
    button: 'inline-flex items-center gap-1.5 px-2 py-1 rounded bg-rose-50 hover:bg-rose-100/70 text-rose-700 font-mono font-medium transition-colors',
    hubs: 'text-[10px] text-rose-500',
    min: 'font-medium text-rose-700',
  },
}

const ROW_ACTION: Record<RowAction, { className: string; icon: string; label: string }> = {
  quickEdit: { className: 'w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700', icon: 'edit', label: 'Quick Edit' },
  createPo: { className: 'w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-indigo-600 font-medium', icon: 'shopping_cart', label: 'Create PO' },
  expedite: { className: 'w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-rose-600 font-medium', icon: 'priority_high', label: 'Expedite Order' },
}

interface ProductTableRowProps {
  product: ProductRow
  isMenuOpen: boolean
  onToggleMenu: () => void
  onOpenLocations: (productName: string, hubs: HubStock[]) => void
  onViewDetail: (sku: string) => void
  onQuickEdit: (sku: string) => void
  onRestock: (sku: string) => void
}

export function ProductTableRow({ product, isMenuOpen, onToggleMenu, onOpenLocations, onViewDetail, onQuickEdit, onRestock }: ProductTableRowProps) {
  const status = STATUS_BADGE[product.status]
  const tone = STOCK_TONE[product.stockTone]
  const action = ROW_ACTION[product.action]

  function handleStockClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onOpenLocations(product.name, product.hubs)
  }

  function handleMenuToggle(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onToggleMenu()
  }

  function handleSecondaryAction() {
    if (product.action === 'quickEdit') onQuickEdit(product.sku)
    else onRestock(product.sku)
  }

  return (
    <tr className={product.isNew ? 'hover:bg-slate-50/60 transition-colors bg-indigo-50/20' : 'hover:bg-slate-50/60 transition-colors'}>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={product.isNew ? 'w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0' : 'w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0'}>
            <span className="material-symbols-outlined text-[17px]">{product.icon}</span>
          </div>
          <div>
            <div className="font-semibold text-slate-900">{product.name}</div>
            <div className="text-[11px] text-slate-400">{product.description}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4"><span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">{product.sku}</span></td>
      <td className="py-3 px-4 text-slate-700">{product.category}</td>
      <td className="py-3 px-4 text-slate-500 font-medium">{product.uom}</td>
      <td className="py-3 px-4 text-right">
        <button className={tone.button} onClick={handleStockClick}>
          <span>{product.stockLabel}</span>
          <span className={tone.hubs}>{product.hubsLabel}</span>
        </button>
      </td>
      <td className="py-3 px-4"><span className={status.badge}><span className={status.dot} />{product.status}</span></td>
      <td className="py-3 px-4"><span className={tone.min}>{product.minLabel}</span><span className={`block text-[10px] ${product.ruleNoteClass}`}>{product.ruleNote}</span></td>
      <td className="py-3 px-4 text-center">
        <div className="relative inline-block text-left">
          <button className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={handleMenuToggle}><span className="material-symbols-outlined text-[18px]">more_horiz</span></button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-40 rounded-lg bg-white border border-slate-200 shadow-lg py-1 z-20 text-left text-xs" id={product.menuId}>
              <button className="w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700" onClick={() => onViewDetail(product.sku)}><span className="material-symbols-outlined text-[16px]">visibility</span> View Details</button>
              <button className={action.className} onClick={handleSecondaryAction}><span className="material-symbols-outlined text-[16px]">{action.icon}</span> {action.label}</button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}
