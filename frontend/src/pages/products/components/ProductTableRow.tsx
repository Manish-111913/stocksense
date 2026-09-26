import { type MouseEvent } from 'react'
import { STOCK_STATUS_LABEL, type Product, type StockStatus } from '../../../api/types.ts'
import { formatQty, plural, RULE_NOTE, STOCK_TONE_BY_STATUS, type StockTone } from '../productsData.ts'

const STATUS_BADGE: Record<StockStatus, { badge: string; dot: string }> = {
  IN_STOCK: {
    badge: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    dot: 'w-1.5 h-1.5 rounded-full bg-emerald-500',
  },
  LOW_STOCK: {
    badge: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60',
    dot: 'w-1.5 h-1.5 rounded-full bg-amber-500',
  },
  OUT_OF_STOCK: {
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

const MENU_ITEM = 'w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700'

interface ProductTableRowProps {
  product: Product
  isMenuOpen: boolean
  canManageStatus: boolean
  onToggleMenu: () => void
  onOpenLocations: (product: Product) => void
  onViewDetail: (product: Product) => void
  onQuickEdit: (product: Product) => void
  onToggleStatus: (product: Product) => void
}

export function ProductTableRow({ product, isMenuOpen, canManageStatus, onToggleMenu, onOpenLocations, onViewDetail, onQuickEdit, onToggleStatus }: ProductTableRowProps) {
  const { stock } = product
  const status = STATUS_BADGE[stock.stockStatus]
  const tone = STOCK_TONE[STOCK_TONE_BY_STATUS[stock.stockStatus]]
  const ruleNote = RULE_NOTE[stock.stockStatus]
  const isActive = product.status === 'ACTIVE'

  function handleStockClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onOpenLocations(product)
  }

  function handleMenuToggle(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onToggleMenu()
  }

  return (
    <tr className={isActive ? 'hover:bg-slate-50/60 transition-colors' : 'hover:bg-slate-50/60 transition-colors bg-slate-50/60 text-slate-500'}>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[17px]">inventory_2</span>
          </div>
          <div>
            <div className="font-semibold text-slate-900">{product.name}</div>
            <div className={isActive ? 'text-[11px] text-slate-400' : 'text-[11px] text-rose-500 font-medium'}>{`${isActive ? 'Active' : 'Inactive'} · ${product.category.name}`}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4"><span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">{product.sku}</span></td>
      <td className="py-3 px-4 text-slate-700">{product.category.name}</td>
      <td className="py-3 px-4 text-slate-500 font-medium">{product.unitOfMeasure}</td>
      <td className="py-3 px-4 text-right">
        <button className={tone.button} onClick={handleStockClick}>
          <span>{`${formatQty(stock.onHand)} ${product.unitOfMeasure}`}</span>
          <span className={tone.hubs}>{`${plural(stock.locationCount, 'Location')} ▾`}</span>
        </button>
      </td>
      <td className="py-3 px-4"><span className={status.badge}><span className={status.dot} />{STOCK_STATUS_LABEL[stock.stockStatus]}</span></td>
      <td className="py-3 px-4"><span className={tone.min}>{`Min: ${formatQty(product.reorderLevel)} ${product.unitOfMeasure}`}</span><span className={`block text-[10px] ${ruleNote.className}`}>{ruleNote.text}</span></td>
      <td className="py-3 px-4 text-center">
        <div className="relative inline-block text-left">
          <button className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={handleMenuToggle}><span className="material-symbols-outlined text-[18px]">more_horiz</span></button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-40 rounded-lg bg-white border border-slate-200 shadow-lg py-1 z-20 text-left text-xs" id={`menu-row-${product.id}`}>
              <button className={MENU_ITEM} onClick={() => onViewDetail(product)}><span className="material-symbols-outlined text-[16px]">visibility</span> View Details</button>
              <button className={MENU_ITEM} onClick={() => onQuickEdit(product)}><span className="material-symbols-outlined text-[16px]">edit</span> Quick Edit</button>
              {canManageStatus && (
                <button className={isActive ? 'w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-rose-600 font-medium' : 'w-full px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-emerald-600 font-medium'} onClick={() => onToggleStatus(product)}>
                  <span className="material-symbols-outlined text-[16px]">{isActive ? 'block' : 'check_circle'}</span> {isActive ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}
