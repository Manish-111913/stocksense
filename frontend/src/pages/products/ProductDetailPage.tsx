import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { ROUTES } from '../../routes.ts'
import {
  CATEGORY_OPTIONS,
  initialDisplay,
  initialForm,
  MODE_BUTTONS,
  UOM_OPTIONS,
  type DetailMode,
  type ProductDisplay,
  type ProductForm,
} from './detail/data.ts'
import { ProductNotFound } from './detail/ProductNotFound.tsx'
import { ProductSkeleton } from './detail/ProductSkeleton.tsx'
import { StockLedgerCard } from './detail/StockLedgerCard.tsx'
import { StockSummaryCard } from './detail/StockSummaryCard.tsx'

const MODE_BTN_ACTIVE = 'px-2.5 py-1 rounded-md font-semibold bg-indigo-600 text-white shadow-xs flex items-center gap-1 transition-all'
const MODE_BTN_INACTIVE = 'px-2.5 py-1 rounded-md font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1'
const EDIT_TRIGGER = 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98]'
const BADGE_VIEW = 'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600'
const BADGE_EDIT = 'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-indigo-100 text-indigo-800'
const SELECT_CLASS = 'appearance-none w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer'

export default function ProductDetailPage() {
  const { sku = 'STL-001' } = useParams()
  useDocumentTitle(`StockSense — Product Detail & Edit (${sku})`)
  // Keyed so that switching SKUs starts from a fresh screen state
  return <ProductDetail key={sku} sku={sku} />
}

function ProductDetail({ sku }: { sku: string }) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [mode, setMode] = useState<DetailMode>('view')
  const [display, setDisplay] = useState<ProductDisplay>(() => initialDisplay(sku))
  const [form, setForm] = useState<ProductForm>(() => initialForm(sku))
  const [isSaving, setIsSaving] = useState(false)
  const saveTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(saveTimer.current), [])

  function updateForm(field: keyof ProductForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleProductEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nameVal = form.name.trim()
    const skuVal = form.sku.trim()
    const { category: catVal, uom: uomVal, reorder: reorderVal } = form

    setIsSaving(true)
    saveTimer.current = window.setTimeout(() => {
      // Update the read-only views
      setDisplay({ name: nameVal, sku: skuVal, category: catVal, uom: uomVal, reorder: `${reorderVal} ${uomVal}` })
      setIsSaving(false)
      setMode('view')
      showToast('Product updated successfully', `${nameVal} (${skuVal}) changes recorded in catalog.`)
    }, 600)
  }

  const isEditing = mode === 'edit'

  return (
    <main className="w-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-7 transition-all duration-150" id="view-product-detail">
      {/* Interactive State / Scenario Preview Switcher Header */}
      <div className="bg-indigo-50/60 border border-indigo-100/90 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-950">
          <span className="material-symbols-outlined text-indigo-600 text-[18px]">tune</span>
          <span>Screen Mode Preview:</span>
          <span className="text-[11px] font-normal text-indigo-700 hidden sm:inline">Toggle screen states to test layout response</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] bg-white p-0.5 rounded-lg border border-indigo-200/70 shadow-xs">
          {MODE_BUTTONS.map((item) => (
            <button className={mode === item.mode ? MODE_BTN_ACTIVE : MODE_BTN_INACTIVE} id={item.id} key={item.mode} onClick={() => setMode(item.mode)}>
              <span className="material-symbols-outlined text-[13px]">{item.icon}</span> {item.label}
            </button>
          ))}
          <div className="h-3.5 w-[1px] bg-indigo-200/80 mx-1" />
          <button className="px-2.5 py-1 rounded-md font-medium text-indigo-700 hover:bg-indigo-50 transition-all flex items-center gap-1" onClick={() => navigate(ROUTES.receiptNew)}>
            <span className="material-symbols-outlined text-[13px]">receipt_long</span> Go to /receipts/new
          </button>
        </div>
      </div>

      {/* CONTAINER 1: NORMAL PRODUCT DETAIL (VIEW & EDIT MODES) */}
      {(mode === 'view' || mode === 'edit') && (
        <div className="space-y-6" id="state-normal-content">
          {/* Breadcrumbs & Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <button className="hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors" onClick={() => navigate(ROUTES.products)}>
                  <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                  <span>Products</span>
                </button>
                <span className="text-slate-300">/</span>
                <span className="font-mono text-slate-500 text-[11px] font-medium">{sku}</span>
                <span className="text-slate-300">/</span>
                <span className="font-semibold text-slate-800" id="headerBreadcrumbTitle">{display.name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900" id="headerProductTitle">{display.name}</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  In Stock (500 KG available across 3 hubs)
                </span>
                <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{sku}</span>
              </div>
            </div>
            {/* Header Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all" onClick={() => navigate(ROUTES.products)}>
                <span className="material-symbols-outlined text-[16px] text-slate-500">arrow_back</span>
                <span>Back to Products</span>
              </button>
              <button className={isEditing ? `${EDIT_TRIGGER} hidden` : EDIT_TRIGGER} id="btnPrimaryEditTrigger" onClick={() => setMode('edit')}>
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Edit Product</span>
              </button>
            </div>
          </div>

          {/* 2-COLUMN MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN (7 Cols): Product Information & Operational Rules */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">inventory</span>
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Product Information &amp; Operational Rules</h2>
                    <p className="text-[11px] text-slate-400">Core parameters, identification, and threshold triggers.</p>
                  </div>
                </div>
                <span className={isEditing ? BADGE_EDIT : BADGE_VIEW} id="cardModeIndicator">
                  {isEditing ? 'Editing Mode' : 'Read-Only View'}
                </span>
              </div>

              {isEditing ? (
                /* EDIT MODE CARD FORM */
                <div className="p-6 space-y-6" id="panelEditMode">
                  <form className="space-y-5" id="productEditForm" onSubmit={handleProductEditSubmit}>
                    {/* Strict Read-Only Stock Guard Banner */}
                    <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-amber-600 text-[18px] flex-shrink-0 mt-0.5">lock</span>
                      <p className="text-xs leading-relaxed">
                        <strong className="font-semibold text-amber-950">Current stock is strictly read-only.</strong> Inventory balances cannot be edited manually and must flow through legitimate Receipts, Deliveries, Transfers, or Adjustments.
                      </p>
                    </div>
                    {/* Product Name Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="editProdName">
                        Product Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                        id="editProdName"
                        onChange={(e) => updateForm('name', e.target.value)}
                        required
                        type="text"
                        value={form.name}
                      />
                    </div>
                    {/* SKU Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="editProdSku">
                        SKU / Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        className="w-full font-mono text-xs px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 focus:outline-none uppercase"
                        id="editProdSku"
                        onChange={(e) => updateForm('sku', e.target.value)}
                        required
                        type="text"
                        value={form.sku}
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Unique immutable SKU key used in barcode scanners and ledger trails.</p>
                    </div>
                    {/* Category & UOM Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="editProdCategory">
                          Category <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select className={SELECT_CLASS} id="editProdCategory" onChange={(e) => updateForm('category', e.target.value)} required value={form.category}>
                            {CATEGORY_OPTIONS.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400 text-base">unfold_more</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="editProdUom">
                          Unit of Measure <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <select className={SELECT_CLASS} id="editProdUom" onChange={(e) => updateForm('uom', e.target.value)} required value={form.uom}>
                            {UOM_OPTIONS.map((uom) => (
                              <option key={uom.value} value={uom.value}>
                                {uom.label}
                              </option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400 text-base">unfold_more</span>
                        </div>
                      </div>
                    </div>
                    {/* Reorder Level */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="editProdReorder">
                        Reorder Level (Alert Threshold) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          className="w-full font-mono text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          id="editProdReorder"
                          min="0"
                          onChange={(e) => updateForm('reorder', e.target.value)}
                          required
                          type="number"
                          value={form.reorder}
                        />
                        <span className="absolute right-3 top-2 text-[11px] text-slate-400 font-mono">KG</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Alert triggers when total available balance across all hubs drops to or below this level.</p>
                    </div>
                    {/* Action buttons */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                      <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors" onClick={() => setMode('view')} type="button">
                        Cancel
                      </button>
                      <button className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-[0.98] transition-all" disabled={isSaving} id="btnSaveDetailEdit" type="submit">
                        <span className={isSaving ? 'material-symbols-outlined text-[16px] animate-spin' : 'material-symbols-outlined text-[16px]'} id="iconSaveBtn">
                          {isSaving ? 'progress_activity' : 'check'}
                        </span>
                        <span id="textSaveBtn">{isSaving ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* VIEW MODE CARD CONTENT */
                <div className="p-6 space-y-6" id="panelViewMode">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Product Name</span>
                      <div className="text-base font-bold text-slate-900" id="displayProdName">{display.name}</div>
                      <p className="text-xs text-slate-500 mt-0.5">Industrial Grade A-36 · High Tensile</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">SKU / Code</span>
                      <div className="font-mono text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-900" id="displayProdSku">{display.sku}</span>
                        <span className="text-[10px] text-slate-400 font-normal">System Master Key</span>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Category</span>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5" id="displayProdCategory">
                        <span className="material-symbols-outlined text-[16px] text-slate-500">category</span>
                        {display.category}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Unit of Measure (UOM)</span>
                      <div className="text-xs font-bold text-slate-800 font-mono" id="displayProdUom">{display.uom}</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/60">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 block mb-1">Reorder Level</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold font-mono text-amber-900" id="displayProdReorder">{display.reorder}</span>
                        <span className="text-[10px] text-amber-700 font-medium">Automatic alert threshold</span>
                      </div>
                    </div>
                    <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Preferred Batch Size</span>
                        <span className="text-xs font-bold font-mono text-slate-800">200 KG</span>{' '}
                        <span className="text-slate-400 text-xs ml-1">(Default Supplier MOQ)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">Auto-PO Enabled</span>
                    </div>
                  </div>
                  {/* Stock Safety Guideline */}
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100/90 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-blue-600 text-[18px] flex-shrink-0 mt-0.5">verified_user</span>
                    <p className="text-xs text-blue-900 leading-relaxed">
                      <strong className="font-semibold text-blue-950">Safety Threshold:</strong> Stock dipping below 50 KG automatically flags PO reorders on the dashboard and alerts the Bengaluru fulfillment desk.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN (5 Cols): Current Stock by Location & Direct Operations */}
            <StockSummaryCard />
          </div>

          {/* FULL-WIDTH BOTTOM SECTION: Recent Stock Movements (Immutable Stock Ledger) */}
          <StockLedgerCard sku={sku} />
        </div>
      )}

      {/* CONTAINER 2: SKELETON LOADING STATE (INSPECTABLE VIA TAB) */}
      {mode === 'skeleton' && <ProductSkeleton />}
      {/* CONTAINER 3: PRODUCT NOT FOUND (404) ERROR STATE */}
      {mode === 'notfound' && <ProductNotFound />}
    </main>
  )
}
