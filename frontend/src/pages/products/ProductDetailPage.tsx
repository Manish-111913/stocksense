import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client.ts'
import { getProduct, listCategories, setProductStatus, updateProduct, type ProductUpdate } from '../../api/products.ts'
import { STOCK_STATUS_LABEL, type Category, type Product, type StockStatus } from '../../api/types.ts'
import { useCurrentUser } from '../../auth/useAuth.ts'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { ROUTES } from '../../routes.ts'
import { ProductNotFound } from './detail/ProductNotFound.tsx'
import { ProductSkeleton } from './detail/ProductSkeleton.tsx'
import { StockLedgerCard } from './detail/StockLedgerCard.tsx'
import { StockSummaryCard } from './detail/StockSummaryCard.tsx'
import { errorMessage, formatDate, formatQty, isUuid, plural, uomLabel, uomOptionsWith } from './productsData.ts'

const EDIT_TRIGGER = 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98]'
const SECONDARY_BTN = 'px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-60'
const BADGE_VIEW = 'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600'
const BADGE_EDIT = 'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-indigo-100 text-indigo-800'
const SELECT_CLASS = 'appearance-none w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer'

const STOCK_BADGE: Record<StockStatus, { badge: string; dot: string }> = {
  IN_STOCK: {
    badge: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70',
    dot: 'w-1.5 h-1.5 rounded-full bg-emerald-500',
  },
  LOW_STOCK: {
    badge: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/70',
    dot: 'w-1.5 h-1.5 rounded-full bg-amber-500',
  },
  OUT_OF_STOCK: {
    badge: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/70',
    dot: 'w-1.5 h-1.5 rounded-full bg-rose-500',
  },
}

/** Values of the edit form inputs */
interface ProductForm {
  name: string
  categoryId: string
  uom: string
  reorder: string
}

const toForm = (product: Product): ProductForm => ({
  name: product.name,
  categoryId: product.category.id,
  uom: product.unitOfMeasure,
  reorder: String(product.reorderLevel),
})

type LoadState = 'loading' | 'ready' | 'notfound' | 'error'

export default function ProductDetailPage() {
  const { id = '' } = useParams()
  // Keyed so that switching products starts from a fresh screen state
  return <ProductDetail id={id} key={id} />
}

function ProductDetail({ id }: { id: string }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isManager = useCurrentUser()?.role === 'INVENTORY_MANAGER'

  const [product, setProduct] = useState<Product | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  // Outcome of the last settled request; a different key means the product is (re)loading
  const [settled, setSettled] = useState<{ key: number; state: Exclude<LoadState, 'loading'> } | null>(null)
  const loadState: LoadState = !isUuid(id) ? 'notfound' : settled?.key === reloadKey ? settled.state : 'loading'
  const [categories, setCategories] = useState<Category[]>([])

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<ProductForm | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  useDocumentTitle(`StockSense — Product Detail & Edit${product ? ` (${product.sku})` : ''}`)

  useEffect(() => {
    if (!isUuid(id)) return
    let cancelled = false
    getProduct(id)
      .then((res) => {
        if (cancelled) return
        setProduct(res)
        setSettled({ key: reloadKey, state: 'ready' })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
          setSettled({ key: reloadKey, state: 'notfound' })
        } else {
          setLoadError(errorMessage(err, 'Could not load this product. Please try again.'))
          setSettled({ key: reloadKey, state: 'error' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

  // Active categories for the edit form
  useEffect(() => {
    listCategories('ACTIVE')
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  function startEditing() {
    if (!product) return
    setForm(toForm(product))
    setFormError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setFormError(null)
  }

  function updateForm(field: keyof ProductForm, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  async function handleProductEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!product || !form) return
    const name = form.name.trim()
    if (!name) {
      setFormError('Product name is required.')
      return
    }

    // Only send what changed (SKU is permanent)
    const input: ProductUpdate = {}
    const reorder = form.reorder === '' ? 0 : Number(form.reorder)
    if (name !== product.name) input.name = name
    if (form.categoryId !== product.category.id) input.categoryId = form.categoryId
    if (form.uom !== product.unitOfMeasure) input.unitOfMeasure = form.uom
    if (reorder !== Number(product.reorderLevel)) input.reorderLevel = reorder
    if (Object.keys(input).length === 0) {
      cancelEditing()
      return
    }

    setIsSaving(true)
    setFormError(null)
    try {
      const updated = await updateProduct(product.id, input)
      setProduct(updated)
      setIsEditing(false)
      showToast('Product updated successfully', `${updated.name} (${updated.sku}) changes recorded in catalog.`)
    } catch (err) {
      setFormError(errorMessage(err, 'Could not save the product. Please try again.'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleStatus() {
    if (!product) return
    const next = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setIsChangingStatus(true)
    setStatusError(null)
    try {
      const updated = await setProductStatus(product.id, next)
      setProduct(updated)
      showToast(next === 'ACTIVE' ? 'Product activated' : 'Product deactivated', `${updated.name} (${updated.sku}) is now ${next === 'ACTIVE' ? 'active' : 'inactive'}.`)
    } catch (err) {
      setStatusError(errorMessage(err, 'Could not change the product status. Please try again.'))
    } finally {
      setIsChangingStatus(false)
    }
  }

  if (loadState === 'loading') {
    return (
      <main className="w-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-7 transition-all duration-150" id="view-product-detail">
        <ProductSkeleton />
      </main>
    )
  }

  if (loadState === 'notfound' || (loadState === 'ready' && !product)) {
    return (
      <main className="w-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-7 transition-all duration-150" id="view-product-detail">
        <ProductNotFound />
      </main>
    )
  }

  if (loadState === 'error' || !product) {
    return (
      <main className="w-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-7 transition-all duration-150" id="view-product-detail">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-12 text-center max-w-lg mx-auto my-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2 border border-rose-100">
            <span className="material-symbols-outlined text-3xl">cloud_off</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Couldn&apos;t load this product</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">{loadError}</p>
          <div className="pt-3 flex items-center justify-center gap-2.5">
            <button className={SECONDARY_BTN} onClick={() => navigate(ROUTES.products)}>
              <span className="material-symbols-outlined text-[16px] text-slate-500">arrow_back</span>
              <span>Back to Products</span>
            </button>
            <button className={EDIT_TRIGGER} onClick={() => setReloadKey((key) => key + 1)}>
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Retry</span>
            </button>
          </div>
        </div>
      </main>
    )
  }

  const { stock } = product
  const uom = product.unitOfMeasure
  const isActive = product.status === 'ACTIVE'
  const stockBadge = STOCK_BADGE[stock.stockStatus]
  const reorderText = `${formatQty(product.reorderLevel)} ${uom}`
  const categoryOptions = categories.some((category) => category.id === product.category.id)
    ? categories.map((category) => ({ id: category.id, name: category.name }))
    : [{ id: product.category.id, name: `${product.category.name} (inactive)` }, ...categories.map((category) => ({ id: category.id, name: category.name }))]

  return (
    <main className="w-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-7 transition-all duration-150" id="view-product-detail">
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
              <span className="font-mono text-slate-500 text-[11px] font-medium">{product.sku}</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800" id="headerBreadcrumbTitle">{product.name}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900" id="headerProductTitle">{product.name}</h1>
              <span className={stockBadge.badge}>
                <span className={stockBadge.dot} />
                {`${STOCK_STATUS_LABEL[stock.stockStatus]} (${formatQty(stock.onHand)} ${uom} available across ${plural(stock.locationCount, 'location')})`}
              </span>
              {!isActive && <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">Inactive</span>}
              <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{product.sku}</span>
            </div>
          </div>
          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button className={SECONDARY_BTN} onClick={() => navigate(ROUTES.products)}>
              <span className="material-symbols-outlined text-[16px] text-slate-500">arrow_back</span>
              <span>Back to Products</span>
            </button>
            {isManager && (
              <button className={SECONDARY_BTN} disabled={isChangingStatus} onClick={handleToggleStatus}>
                <span className={isActive ? 'material-symbols-outlined text-[16px] text-rose-500' : 'material-symbols-outlined text-[16px] text-emerald-600'}>{isActive ? 'block' : 'check_circle'}</span>
                <span>{isChangingStatus ? 'Updating...' : isActive ? 'Deactivate' : 'Activate'}</span>
              </button>
            )}
            <button className={isEditing ? `${EDIT_TRIGGER} hidden` : EDIT_TRIGGER} id="btnPrimaryEditTrigger" onClick={startEditing}>
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Edit Product</span>
            </button>
          </div>
        </div>

        {statusError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {statusError}
            </span>
            <button className="p-0.5 rounded text-rose-500 hover:text-rose-700" onClick={() => setStatusError(null)}>
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

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

            {isEditing && form ? (
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
                  {formError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5" id="editProductError">
                      <span className="material-symbols-outlined text-[18px] flex-shrink-0">error</span>
                      <span>{formError}</span>
                    </div>
                  )}
                  {/* Product Name Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="editProdName">
                      Product Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                      id="editProdName"
                      maxLength={200}
                      onChange={(e) => updateForm('name', e.target.value)}
                      required
                      type="text"
                      value={form.name}
                    />
                  </div>
                  {/* SKU (permanent) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="editProdSku">
                      SKU / Code
                    </label>
                    <input className="w-full font-mono text-xs px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 focus:outline-none uppercase cursor-not-allowed" id="editProdSku" readOnly type="text" value={product.sku} />
                    <p className="text-[10px] text-slate-400 mt-1">The SKU is permanent and can&apos;t be changed after creation.</p>
                  </div>
                  {/* Category & UOM Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="editProdCategory">
                        Category <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select className={SELECT_CLASS} id="editProdCategory" onChange={(e) => updateForm('categoryId', e.target.value)} required value={form.categoryId}>
                          {categoryOptions.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
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
                          {uomOptionsWith(product.unitOfMeasure).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400 text-base">unfold_more</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Locked once stock has been recorded for this product.</p>
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
                        onChange={(e) => updateForm('reorder', Number(e.target.value) < 0 ? '0' : e.target.value)}
                        required
                        step="any"
                        type="number"
                        value={form.reorder}
                      />
                      <span className="absolute right-3 top-2 text-[11px] text-slate-400 font-mono">{form.uom}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Alert triggers when total available balance across all locations drops to or below this level.</p>
                  </div>
                  {/* Action buttons */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors" onClick={cancelEditing} type="button">
                      Cancel
                    </button>
                    <button className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-70" disabled={isSaving} id="btnSaveDetailEdit" type="submit">
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
                    <div className="text-base font-bold text-slate-900" id="displayProdName">{product.name}</div>
                    <p className="text-xs text-slate-500 mt-0.5">{`Created by ${product.createdBy.fullName} on ${formatDate(product.createdAt)}`}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">SKU / Code</span>
                    <div className="font-mono text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-900" id="displayProdSku">{product.sku}</span>
                      <span className="text-[10px] text-slate-400 font-normal">System Master Key</span>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Category</span>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5" id="displayProdCategory">
                      <span className="material-symbols-outlined text-[16px] text-slate-500">category</span>
                      {product.category.status === 'ACTIVE' ? product.category.name : `${product.category.name} (inactive)`}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Unit of Measure (UOM)</span>
                    <div className="text-xs font-bold text-slate-800 font-mono" id="displayProdUom">{uomLabel(uom)}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/60">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 block mb-1">Reorder Level</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-bold font-mono text-amber-900" id="displayProdReorder">{reorderText}</span>
                      <span className="text-[10px] text-amber-700 font-medium">Automatic alert threshold</span>
                    </div>
                  </div>
                  <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">Record Status</span>
                      <span className="text-xs font-bold font-mono text-slate-800">{isActive ? 'Active' : 'Inactive'}</span>{' '}
                      <span className="text-slate-400 text-xs ml-1">{`(Last updated ${formatDate(product.updatedAt)})`}</span>
                    </div>
                    <span className={isActive ? 'px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100' : 'px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200'}>
                      {isActive ? 'Available for operations' : 'Deactivated'}
                    </span>
                  </div>
                </div>
                {/* Stock Safety Guideline */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100/90 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-blue-600 text-[18px] flex-shrink-0 mt-0.5">verified_user</span>
                  <p className="text-xs text-blue-900 leading-relaxed">
                    <strong className="font-semibold text-blue-950">Safety Threshold:</strong> {`When total stock across all locations falls to or below ${reorderText}, this product is flagged as low stock.`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (5 Cols): Current Stock by Location & Direct Operations */}
          <StockSummaryCard product={product} />
        </div>

        {/* FULL-WIDTH BOTTOM SECTION: Recent Stock Movements (Stock Ledger) */}
        <StockLedgerCard sku={product.sku} />
      </div>
    </main>
  )
}
