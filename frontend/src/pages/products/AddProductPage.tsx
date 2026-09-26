import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { ROUTES } from '../../routes.ts'
import { addProduct, generateSku } from './productsData.ts'

const isValidName = (value: string) => value.trim().length > 0
const isValidSku = (value: string) => value.trim().length >= 3

// validateNonNegative: negative quantities snap back to 0
const nonNegative = (event: ChangeEvent<HTMLInputElement>) => (Number(event.target.value) < 0 ? '0' : event.target.value)

export default function AddProductPage() {
  useDocumentTitle('StockSense — Products Management')
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  // Entering the view pre-populates a sample SKU (autoGenerateNewSKU)
  const [sku, setSku] = useState(generateSku)
  const [category, setCategory] = useState('')
  const [uom, setUom] = useState('PCS')
  const [initialStock, setInitialStock] = useState('')
  const [reorderLevel, setReorderLevel] = useState('')
  // Validation indicators: undefined = both hidden, true = success icon, false = error message
  const [nameValid, setNameValid] = useState<boolean | undefined>(undefined)
  const [skuValid, setSkuValid] = useState<boolean | undefined>(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const submitTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return () => window.clearTimeout(submitTimer.current)
  }, [])

  function autoGenerateNewSKU() {
    const newSku = generateSku()
    setSku(newSku)
    setSkuValid(isValidSku(newSku))
  }

  // Handle Unsaved Changes Guard
  function requestReturnToList() {
    if (name.trim() || initialStock.trim() || reorderLevel.trim()) {
      setShowUnsavedModal(true)
    } else {
      navigate(ROUTES.products)
    }
  }

  function closeUnsavedModal() {
    setShowUnsavedModal(false)
  }

  function confirmDiscardChanges() {
    setShowUnsavedModal(false)
    navigate(ROUTES.products)
  }

  function handleNewProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nameOk = isValidName(name)
    setNameValid(nameOk)
    let skuOk = false
    if (nameOk) {
      skuOk = isValidSku(sku)
      setSkuValid(skuOk)
    }

    if (!nameOk || !skuOk || !category) {
      if (!category) {
        alert('Please choose a valid Product Category.')
      }
      return
    }

    setIsSubmitting(true)

    const product = {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      category,
      uom,
      stock: parseInt(initialStock || '0'),
      reorder: reorderLevel || '50',
    }
    const toastSku = sku.trim()

    submitTimer.current = window.setTimeout(() => {
      addProduct(product)
      showToast('Product created successfully', `Added SKU ${toastSku} to catalog.`)
      navigate(ROUTES.products)
    }, 600)
  }

  return (
    <>
      {/* VIEW 2: INTEGRATED ADD PRODUCT / CREATE PRODUCT (/products/new) */}
      <main className="w-full space-y-6 bg-slate-50/40 p-4 sm:p-8 transition-all duration-150" id="view-products-create">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* 1. Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <button className="hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors" onClick={requestReturnToList}>
              <span className="material-symbols-outlined text-[15px]">inventory_2</span>
              <span>Products</span>
            </button>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-800">Add Product</span>
            <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-indigo-50 text-indigo-700 font-medium ml-1">/products/new</span>
          </nav>

          {/* 2. Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Product</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Create a product and configure its inventory settings.</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-600 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-all" onClick={requestReturnToList}>
                <span className="material-symbols-outlined text-[16px]">close</span> Cancel
              </button>
            </div>
          </div>

          {/* 3. Form Container: Clean Apple-inspired minimal enterprise card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <form className="p-6 sm:p-8 space-y-8" id="createProductFullForm" onSubmit={handleNewProductSubmit}>
              {/* SECTION 1: Basic Information */}
              <section className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[17px]">inventory</span>
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Basic Information</h2>
                      <p className="text-[11px] text-slate-400">Core identification and classification parameters.</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium"><span className="text-rose-500 font-bold">*</span> Mandatory fields</span>
                </div>
                <div className="space-y-4">
                  {/* Product Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="newProdName">
                      Product Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                        id="newProdName"
                        onChange={(e) => {
                          setName(e.target.value)
                          setNameValid(isValidName(e.target.value))
                        }}
                        placeholder="Enter product name"
                        required
                        type="text"
                        value={name}
                      />
                      {nameValid === true && <span className="material-symbols-outlined text-emerald-500 absolute right-3 top-2.5 text-base" id="nameSuccessIcon">check_circle</span>}
                    </div>
                    {nameValid === false && (
                      <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1" id="nameErrorMsg">
                        <span className="material-symbols-outlined text-[13px]">error</span> Product name is required.
                      </p>
                    )}
                  </div>

                  {/* SKU / Code */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700" htmlFor="newProdSku">
                        SKU / Code <span className="text-rose-500">*</span>
                      </label>
                      <button className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1" onClick={autoGenerateNewSKU} type="button">
                        <span className="material-symbols-outlined text-[13px]">magic_button</span> Auto-Generate
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        className="w-full font-mono text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                        id="newProdSku"
                        onChange={(e) => {
                          setSku(e.target.value)
                          setSkuValid(isValidSku(e.target.value))
                        }}
                        placeholder="e.g. STL-001"
                        required
                        type="text"
                        value={sku}
                      />
                      {skuValid === true && <span className="material-symbols-outlined text-emerald-500 absolute right-3 top-2.5 text-base" id="skuSuccessIcon">check_circle</span>}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">A unique identifier for this product.</p>
                    {skuValid === false && (
                      <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1" id="skuErrorMsg">
                        <span className="material-symbols-outlined text-[13px]">error</span> A valid SKU code is required.
                      </p>
                    )}
                  </div>

                  {/* Category & UOM Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="newProdCategory">
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select className="appearance-none w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer transition-all" id="newProdCategory" onChange={(e) => setCategory(e.target.value)} required value={category}>
                          <option disabled value="">Select category...</option>
                          <option value="Raw Materials">Raw Materials</option>
                          <option value="Finished Goods">Finished Goods</option>
                          <option value="Electronics">Electronics</option>
                          <option value="Furniture">Furniture</option>
                          <option value="Hardware">Hardware</option>
                          <option value="Consumables">Consumables</option>
                        </select>
                        <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400 text-base">unfold_more</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="newProdUom">
                        Unit of Measure <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select className="appearance-none w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer transition-all" id="newProdUom" onChange={(e) => setUom(e.target.value)} required value={uom}>
                          <option value="PCS">PCS (Pieces)</option>
                          <option value="KG">KG (Kilograms)</option>
                          <option value="L">L (Litres)</option>
                          <option value="M">M (Meters)</option>
                          <option value="BOX">BOX (Boxes / Cartons)</option>
                        </select>
                        <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400 text-base">unfold_more</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 2: Inventory Settings */}
              <section className="space-y-5 pt-2">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[17px]">tune</span>
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Inventory Settings</h2>
                    <p className="text-[11px] text-slate-400">Configure the initial quantity and reorder threshold for this product.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Initial Stock */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700" htmlFor="newProdInitialStock">Initial Stock</label>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/80 text-slate-600">(Optional)</span>
                    </div>
                    <input className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" id="newProdInitialStock" min="0" onChange={(e) => setInitialStock(nonNegative(e))} placeholder="0" type="number" value={initialStock} />
                    <p className="text-[11px] text-slate-500 leading-tight">Use this only when the product already has stock at creation time.</p>
                  </div>
                  {/* Reorder Level */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700" htmlFor="newProdReorderLevel">Reorder Level</label>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">Alert Trigger</span>
                    </div>
                    <input className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" id="newProdReorderLevel" min="0" onChange={(e) => setReorderLevel(nonNegative(e))} placeholder="50" type="number" value={reorderLevel} />
                    <p className="text-[11px] text-slate-500 leading-tight">Alert when available stock reaches this level.</p>
                  </div>
                </div>
                {/* Compact Stock Logic Notice */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-blue-600 text-[18px] flex-shrink-0 mt-0.5">info</span>
                  <p className="text-xs text-blue-900/90 leading-relaxed">
                    <strong className="font-semibold text-blue-950">Stock Logic Note:</strong> When current stock reaches or falls below this level, the product will be considered low stock. Operational stock adjustments must flow through receipts, deliveries, or inventory adjustments.
                  </p>
                </div>
              </section>

              {/* 4. Form Actions at Bottom */}
              <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                <button className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors" onClick={requestReturnToList} type="button">
                  Cancel
                </button>
                <button className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all" disabled={isSubmitting} id="btnSubmitNewProduct" type="submit">
                  <span className={isSubmitting ? 'material-symbols-outlined text-[17px] animate-spin' : 'material-symbols-outlined text-[17px]'} id="btnSubmitIcon">{isSubmitting ? 'progress_activity' : 'add_circle'}</span>
                  <span id="btnSubmitLabel">{isSubmitting ? 'Creating product...' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Unsaved Changes Modal Support */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs" id="unsavedChangesModal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-100">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-xl">warning</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">Discard unsaved product?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">You have unsaved changes in this form. If you leave now, the product data you entered will be lost.</p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors" onClick={closeUnsavedModal}>
                Keep Editing
              </button>
              <button className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors" onClick={confirmDiscardChanges}>
                Discard &amp; Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
