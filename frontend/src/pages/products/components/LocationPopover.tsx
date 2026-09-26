import { type HubStock } from '../productsData.ts'

interface LocationPopoverProps {
  productName: string
  hubs: HubStock[]
  onClose: () => void
}

// Stock by Location Popover Modal
export function LocationPopover({ productName, hubs, onClose }: LocationPopoverProps) {
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
          {hubs.map((hub) => (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs" key={hub.name}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-slate-400">warehouse</span>
                <span className="font-medium text-slate-700">{hub.name}</span>
              </div>
              <span className="font-mono font-semibold text-indigo-600">{hub.qty}</span>
            </div>
          ))}
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
