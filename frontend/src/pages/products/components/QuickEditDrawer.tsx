import { useState, type FormEvent } from 'react'

interface QuickEditDrawerProps {
  sku: string
  onClose: () => void
  onSaved: (sku: string) => void
}

// Quick Edit Drawer; the original pre-fills STL-001's values, and CHR-002's for every other SKU
export function QuickEditDrawer({ sku, onClose, onSaved }: QuickEditDrawerProps) {
  const [name, setName] = useState(sku === 'STL-001' ? 'Steel Rod 20mm' : 'Ergonomic Office Chair')
  const [category, setCategory] = useState(sku === 'STL-001' ? 'Raw Materials' : 'Finished Goods')
  const [minThreshold, setMinThreshold] = useState(sku === 'STL-001' ? '50' : '15')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSaved(sku)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity" id="productDrawer">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/60">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Quick Edit</span>
            <h3 className="text-base font-bold text-slate-900" id="drawerHeading">Edit Product</h3>
          </div>
          <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onClick={onClose}>
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <form className="p-6 space-y-4 flex-1 text-xs" id="quickEditForm" onSubmit={handleSubmit}>
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="quickProdName">Product Name</label>
            <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500" id="quickProdName" onChange={(e) => setName(e.target.value)} required type="text" value={name} />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="quickProdSku">SKU / Code</label>
            <input className="w-full font-mono px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700" id="quickProdSku" readOnly type="text" value={sku} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="quickProdCategory">Category</label>
              <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500" id="quickProdCategory" onChange={(e) => setCategory(e.target.value)} value={category}>
                <option value="Raw Materials">Raw Materials</option>
                <option value="Finished Goods">Finished Goods</option>
                <option value="Electronics">Electronics</option>
                <option value="Hardware">Hardware</option>
                <option value="Consumables">Consumables</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="quickProdMin">Min Threshold</label>
              <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500" id="quickProdMin" min="0" onChange={(e) => setMinThreshold(e.target.value)} type="number" value={minThreshold} />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/60 -mx-6 -mb-6 mt-6 flex items-center justify-end gap-2.5">
            <button className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs" onClick={onClose} type="button">Cancel</button>
            <button className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs" type="submit">Update</button>
          </div>
        </form>
      </div>
    </div>
  )
}
