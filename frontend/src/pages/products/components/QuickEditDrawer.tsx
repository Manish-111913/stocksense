import { useState, type FormEvent } from 'react'
import { updateProduct } from '../../../api/products.ts'
import type { Category, Product } from '../../../api/types.ts'
import { errorMessage } from '../productsData.ts'

interface QuickEditDrawerProps {
  product: Product
  /** Active categories; the product's current one is added if it has been deactivated */
  categories: Category[]
  onClose: () => void
  onSaved: (product: Product) => void
}

// Quick Edit Drawer: name, category and reorder threshold
export function QuickEditDrawer({ product, categories, onClose, onSaved }: QuickEditDrawerProps) {
  const [name, setName] = useState(product.name)
  const [categoryId, setCategoryId] = useState(product.category.id)
  const [minThreshold, setMinThreshold] = useState(String(product.reorderLevel))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categoryOptions = categories.some((category) => category.id === product.category.id)
    ? categories.map((category) => ({ id: category.id, name: category.name }))
    : [{ id: product.category.id, name: `${product.category.name} (inactive)` }, ...categories.map((category) => ({ id: category.id, name: category.name }))]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Product name is required.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const updated = await updateProduct(product.id, {
        name: name.trim(),
        categoryId,
        reorderLevel: minThreshold === '' ? 0 : Number(minThreshold),
      })
      onSaved(updated)
    } catch (err) {
      setError(errorMessage(err, 'Could not save the product. Please try again.'))
      setIsSaving(false)
    }
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
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="quickProdName">Product Name</label>
            <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500" id="quickProdName" maxLength={200} onChange={(e) => setName(e.target.value)} required type="text" value={name} />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="quickProdSku">SKU / Code</label>
            <input className="w-full font-mono px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700" id="quickProdSku" readOnly type="text" value={product.sku} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="quickProdCategory">Category</label>
              <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500" id="quickProdCategory" onChange={(e) => setCategoryId(e.target.value)} value={categoryId}>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1" htmlFor="quickProdMin">{`Min Threshold (${product.unitOfMeasure})`}</label>
              <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500" id="quickProdMin" min="0" onChange={(e) => setMinThreshold(Number(e.target.value) < 0 ? '0' : e.target.value)} step="any" type="number" value={minThreshold} />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/60 -mx-6 -mb-6 mt-6 flex items-center justify-end gap-2.5">
            <button className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs" onClick={onClose} type="button">Cancel</button>
            <button className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-60" disabled={isSaving} type="submit">{isSaving ? 'Updating...' : 'Update'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
