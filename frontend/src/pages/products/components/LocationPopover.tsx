import type { ProductStockLocation } from '../../../api/types.ts'
import { formatQty } from '../productsData.ts'

interface LocationPopoverProps {
  productName: string
  uom: string
  locations: ProductStockLocation[]
  onClose: () => void
}

// Stock by Location Popover Modal
export function LocationPopover({ productName, uom, locations, onClose }: LocationPopoverProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs" id="locationPopover">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Inventory Distribution</span>
            <h4 className="text-sm font-bold text-slate-900" id="locPopoverTitle">{productName}</h4>
          </div>
          <button className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="mt-4 space-y-2" id="locPopoverContent">
          {locations.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
              <span className="material-symbols-outlined text-[20px] text-slate-400 block mb-1">inventory</span>
              No stock recorded at any location yet. Stock is added through receipts, transfers and adjustments.
            </div>
          ) : (
            locations.map((location) => (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs" key={location.locationId}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">warehouse</span>
                  <div>
                    <span className="font-medium text-slate-700 block">{location.warehouseName}</span>
                    <span className="text-[10px] text-slate-400">{location.locationName} · {location.locationCode}</span>
                  </div>
                </div>
                <span className="font-mono font-semibold text-indigo-600">{`${formatQty(location.quantity)} ${uom}`}</span>
              </div>
            ))
          )}
        </div>
        <div className="mt-5 flex justify-end">
          <button className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
