import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../../api/client.ts'
import { createCategory, createProduct, listCategories } from '../../api/products.ts'
import type { Category, Location, Warehouse } from '../../api/types.ts'
import { listLocations, listWarehouses } from '../../api/warehouses.ts'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { productDetailPath, ROUTES } from '../../routes.ts'
import { errorMessage, suggestSku, UOM_OPTIONS } from './productsData.ts'

const isValidName = (value: string) => value.trim().length > 0
// Letters, digits and . _ / - (the server stores SKUs uppercase)
const isValidSku = (value: string) => /^[A-Z0-9][A-Z0-9._/-]*$/i.test(value.trim())

// validateNonNegative: negative quantities snap back to 0
const nonNegative = (event: ChangeEvent<HTMLInputElement>) => (Number(event.target.value) < 0 ? '0' : event.target.value)

/** Inline error for the opening stock quantity (empty or 0 = no opening stock) */
function initialStockError(value: string): string | null {
  const text = value.trim()
  if (!text) return null
  const qty = Number(text)
  if (!Number.isFinite(qty)) return 'Enter a valid quantity.'
  if (qty < 0) return 'Initial stock cannot be negative.'
  if (Math.abs(qty * 1000 - Math.round(qty * 1000)) > 1e-6) return 'Use at most 3 decimal places.'
  return null
}

const SELECT_CLASS =
  'appearance-none w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-60'

export default function AddProductPage() {
  useDocumentTitle('StockSense — Products Management')
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('')
  const [uom, setUom] = useState(UOM_OPTIONS[0].value)
  const [reorderLevel, setReorderLevel] = useState('')
  // Validation indicators: undefined = both hidden, true = success icon, false = error message
  const [nameValid, setNameValid] = useState<boolean | undefined>(undefined)
  const [skuValid, setSkuValid] = useState<boolean | undefined>(undefined)
  const [skuError, setSkuError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)

  // Categories (active only) and the inline "new category" form
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesReload, setCategoriesReload] = useState(0)
  // Outcome of the last settled categories request; a different key means it's loading
  const [categoriesSettled, setCategoriesSettled] = useState<{ key: number; state: 'ready' | 'error' } | null>(null)
  const categoriesState = categoriesSettled?.key === categoriesReload ? categoriesSettled.state : 'loading'
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryError, setNewCategoryError] = useState<string | null>(null)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  // Opening stock: quantity + where it sits (both selects required only when quantity > 0)
  const [initialStock, setInitialStock] = useState('')
  const [initialStockErr, setInitialStockErr] = useState<string | null>(null)
  const [warehouseId, setWarehouseId] = useState('')
  const [warehouseError, setWarehouseError] = useState<string | null>(null)
  const [locationId, setLocationId] = useState('')
  const [locationError, setLocationError] = useState<string | null>(null)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehousesReload, setWarehousesReload] = useState(0)
  const [warehousesSettled, setWarehousesSettled] = useState<{ key: number; state: 'ready' | 'error' } | null>(null)
  const warehousesState = warehousesSettled?.key === warehousesReload ? warehousesSettled.state : 'loading'
  const [locationsReload, setLocationsReload] = useState(0)
  const locationsKey = `${warehouseId}:${locationsReload}`
  const [locationsSettled, setLocationsSettled] = useState<{ key: string; state: 'ready' | 'error'; items: Location[] } | null>(null)
  const locationsState = !warehouseId ? 'idle' : locationsSettled?.key === locationsKey ? locationsSettled.state : 'loading'
  const locations = locationsState === 'ready' && locationsSettled ? locationsSettled.items : []
  // Ignore a stale pick (e.g. the warehouse changed or its list was refreshed)
  const selectedLocationId = locations.some((item) => item.id === locationId) ? locationId : ''
  const noWarehouses = warehousesState === 'ready' && warehouses.length === 0
  const stockQty = initialStockError(initialStock) ? 0 : Number(initialStock.trim() || 0)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    let cancelled = false
    listWarehouses({ status: 'ACTIVE', limit: 100 })
      .then((res) => {
        if (cancelled) return
        setWarehouses(res.data)
        setWarehouseId((current) => (res.data.some((item) => item.id === current) ? current : res.data.length === 1 ? res.data[0].id : ''))
        setWarehousesSettled({ key: warehousesReload, state: 'ready' })
      })
      .catch(() => {
        if (!cancelled) setWarehousesSettled({ key: warehousesReload, state: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [warehousesReload])

  useEffect(() => {
    if (!warehouseId) return
    let cancelled = false
    const key = `${warehouseId}:${locationsReload}`
    listLocations({ warehouseId, status: 'ACTIVE' })
      .then((res) => {
        if (cancelled) return
        setLocationsSettled({ key, state: 'ready', items: res })
        setLocationId((current) => (res.some((item) => item.id === current) ? current : res.length === 1 ? res[0].id : ''))
      })
      .catch(() => {
        if (!cancelled) setLocationsSettled({ key, state: 'error', items: [] })
      })
    return () => {
      cancelled = true
    }
  }, [warehouseId, locationsReload])

  useEffect(() => {
    let cancelled = false
    listCategories('ACTIVE')
      .then((res) => {
        if (cancelled) return
        setCategories(res)
        setCategory((current) => (res.some((item) => item.id === current) ? current : ''))
        setCategoriesSettled({ key: categoriesReload, state: 'ready' })
        // Nothing to pick from yet: open the inline form right away
        if (res.length === 0) setShowNewCategory(true)
      })
      .catch(() => {
        if (!cancelled) setCategoriesSettled({ key: categoriesReload, state: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [categoriesReload])

  function autoGenerateNewSKU() {
    const newSku = suggestSku(name)
    if (!newSku) {
      setNameValid(false)
      return
    }
    setSku(newSku)
    setSkuError(null)
    setSkuValid(isValidSku(newSku))
  }

  async function handleCreateCategory() {
    const categoryName = newCategoryName.trim()
    if (!categoryName) {
      setNewCategoryError('Category name is required.')
      return
    }
    setIsCreatingCategory(true)
    setNewCategoryError(null)
    try {
      const created = await createCategory({ name: categoryName })
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setCategory(created.id)
      setCategoryError(null)
      setNewCategoryName('')
      setShowNewCategory(false)
      showToast('Category created', `${created.name} is ready to use.`)
    } catch (err) {
      setNewCategoryError(errorMessage(err, 'Could not create the category. Please try again.'))
    } finally {
      setIsCreatingCategory(false)
    }
  }

  // Handle Unsaved Changes Guard
  function requestReturnToList() {
    if (name.trim() || sku.trim() || category || reorderLevel.trim() || initialStock.trim()) {
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

  async function handleNewProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const nameOk = isValidName(name)
    setNameValid(nameOk)
    const skuOk = isValidSku(sku)
    setSkuError(null)
    setSkuValid(skuOk)
    setCategoryError(category ? null : 'Please choose a product category.')

    const qtyErr = initialStockError(initialStock)
    setInitialStockErr(qtyErr)
    const withStock = !qtyErr && stockQty > 0
    const whErr = withStock && !warehouseId ? 'Please choose a warehouse.' : null
    const locErr = withStock && !selectedLocationId ? 'Please choose a location.' : null
    setWarehouseError(whErr)
    setLocationError(locErr)

    if (!nameOk || !skuOk || !category || qtyErr || whErr || locErr) return

    setIsSubmitting(true)
    try {
      const product = await createProduct({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        categoryId: category,
        unitOfMeasure: uom,
        ...(reorderLevel.trim() ? { reorderLevel: Number(reorderLevel) } : {}),
        ...(withStock ? { initialStock: { warehouseId, locationId: selectedLocationId, quantity: stockQty } } : {}),
      })
      showToast('Product created successfully', `Added SKU ${product.sku} to catalog.`)
      navigate(productDetailPath(product.id))
    } catch (err) {
      const message = errorMessage(err, 'Could not create the product. Please try again.')
      if (withStock && err instanceof ApiError && err.status !== 409 && /warehouse|location/i.test(message)) {
        // Opening stock rejected (nothing was created): show it and refresh the pickers
        setFormError(message)
        setWarehousesReload((key) => key + 1)
        setLocationsReload((key) => key + 1)
      } else if (err instanceof ApiError && (err.status === 409 || /sku/i.test(message))) {
        setSkuValid(false)
        setSkuError(message)
      } else if (err instanceof ApiError && /category/i.test(message)) {
        setCategoryError(message)
        // The category may have been deactivated meanwhile: refresh the list
        setCategoriesReload((key) => key + 1)
      } else {
        setFormError(message)
      }
      setIsSubmitting(false)
    }
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
            <form className="p-6 sm:p-8 space-y-8" id="createProductFullForm" noValidate onSubmit={handleNewProductSubmit}>
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5" id="createProductError">
                  <span className="material-symbols-outlined text-[18px] flex-shrink-0">error</span>
                  <span>{formError}</span>
                </div>
              )}
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
                        maxLength={200}
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
                      <button className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1" onClick={autoGenerateNewSKU} title="Suggest a SKU from the product name" type="button">
                        <span className="material-symbols-outlined text-[13px]">magic_button</span> Auto-Generate
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        className="w-full font-mono text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                        id="newProdSku"
                        onChange={(e) => {
                          setSku(e.target.value)
                          setSkuError(null)
                          setSkuValid(isValidSku(e.target.value))
                        }}
                        maxLength={100}
                        placeholder="Enter a unique SKU code"
                        required
                        type="text"
                        value={sku}
                      />
                      {skuValid === true && <span className="material-symbols-outlined text-emerald-500 absolute right-3 top-2.5 text-base" id="skuSuccessIcon">check_circle</span>}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">A unique identifier for this product.</p>
                    {skuValid === false && (
                      <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1" id="skuErrorMsg">
                        <span className="material-symbols-outlined text-[13px]">error</span> {skuError ?? 'A valid SKU is required (letters, digits and . _ / - only).'}
                      </p>
                    )}
                  </div>

                  {/* Category & UOM Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700" htmlFor="newProdCategory">
                          Category <span className="text-rose-500">*</span>
                        </label>
                        {!showNewCategory && categoriesState === 'ready' && (
                          <button className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1" onClick={() => setShowNewCategory(true)} type="button">
                            <span className="material-symbols-outlined text-[13px]">add</span> New Category
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <select
                          className="appearance-none w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={categoriesState !== 'ready' || categories.length === 0}
                          id="newProdCategory"
                          onChange={(e) => {
                            setCategory(e.target.value)
                            setCategoryError(null)
                          }}
                          required
                          value={category}
                        >
                          <option disabled value="">
                            {categoriesState === 'loading' ? 'Loading categories...' : categories.length === 0 ? 'No categories yet' : 'Select category...'}
                          </option>
                          {categories.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400 text-base">unfold_more</span>
                      </div>
                      {categoriesState === 'error' && (
                        <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">error</span> Could not load categories.
                          <button className="font-semibold underline hover:text-rose-700" onClick={() => setCategoriesReload((key) => key + 1)} type="button">
                            Retry
                          </button>
                        </p>
                      )}
                      {categoriesState === 'ready' && categories.length === 0 && (
                        <p className="text-[11px] text-slate-500 mt-1">No categories exist yet. Create one below to classify this product.</p>
                      )}
                      {categoryError && (
                        <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1" id="categoryErrorMsg">
                          <span className="material-symbols-outlined text-[13px]">error</span> {categoryError}
                        </p>
                      )}
                      {showNewCategory && (
                        <div className="mt-2 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                          <label className="block text-[11px] font-semibold text-slate-700" htmlFor="newCategoryName">New category name</label>
                          <div className="flex items-center gap-2">
                            <input
                              className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              id="newCategoryName"
                              maxLength={100}
                              onChange={(e) => {
                                setNewCategoryName(e.target.value)
                                setNewCategoryError(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  void handleCreateCategory()
                                }
                              }}
                              placeholder="Enter category name"
                              type="text"
                              value={newCategoryName}
                            />
                            <button className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold disabled:opacity-60" disabled={isCreatingCategory} onClick={() => void handleCreateCategory()} type="button">
                              {isCreatingCategory ? 'Creating...' : 'Create'}
                            </button>
                            {categories.length > 0 && (
                              <button
                                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold"
                                onClick={() => {
                                  setShowNewCategory(false)
                                  setNewCategoryName('')
                                  setNewCategoryError(null)
                                }}
                                type="button"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                          {newCategoryError && (
                            <p className="text-[11px] text-rose-500 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">error</span> {newCategoryError}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="newProdUom">
                        Unit of Measure <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select className="appearance-none w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer transition-all" id="newProdUom" onChange={(e) => setUom(e.target.value)} required value={uom}>
                          {UOM_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
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
                    <p className="text-[11px] text-slate-400">Opening stock and the reorder threshold for this product.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Initial Stock */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700" htmlFor="newProdInitialStock">Initial Stock</label>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/80 text-slate-600">(Optional)</span>
                    </div>
                    <input
                      className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      disabled={warehousesState !== 'ready' || noWarehouses}
                      id="newProdInitialStock"
                      min="0"
                      onChange={(e) => {
                        setInitialStock(e.target.value)
                        setInitialStockErr(initialStockError(e.target.value))
                        setWarehouseError(null)
                        setLocationError(null)
                      }}
                      placeholder="0"
                      step="any"
                      type="number"
                      value={initialStock}
                    />
                    {initialStockErr && (
                      <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1" id="initialStockErrorMsg">
                        <span className="material-symbols-outlined text-[13px]">error</span> {initialStockErr}
                      </p>
                    )}
                    {noWarehouses ? (
                      <p className="text-[11px] text-slate-500 leading-tight">
                        No active warehouses yet.{' '}
                        <Link className="font-semibold text-indigo-600 hover:text-indigo-800 underline" to={ROUTES.warehouse}>
                          Set up a warehouse
                        </Link>{' '}
                        to record opening stock.
                      </p>
                    ) : warehousesState === 'error' ? (
                      <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">error</span> Could not load warehouses.
                        <button className="font-semibold underline hover:text-rose-700" onClick={() => setWarehousesReload((key) => key + 1)} type="button">
                          Retry
                        </button>
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1" htmlFor="newProdStockWarehouse">
                            Warehouse {stockQty > 0 && <span className="text-rose-500">*</span>}
                          </label>
                          <div className="relative">
                            <select
                              className={SELECT_CLASS}
                              disabled={warehousesState !== 'ready'}
                              id="newProdStockWarehouse"
                              onChange={(e) => {
                                setWarehouseId(e.target.value)
                                setLocationId('')
                                setWarehouseError(null)
                                setLocationError(null)
                              }}
                              value={warehouseId}
                            >
                              <option disabled value="">
                                {warehousesState === 'loading' ? 'Loading...' : 'Select warehouse...'}
                              </option>
                              {warehouses.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400 text-base">unfold_more</span>
                          </div>
                          {warehouseError && (
                            <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1" id="stockWarehouseErrorMsg">
                              <span className="material-symbols-outlined text-[13px]">error</span> {warehouseError}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1" htmlFor="newProdStockLocation">
                            Location {stockQty > 0 && <span className="text-rose-500">*</span>}
                          </label>
                          <div className="relative">
                            <select
                              className={SELECT_CLASS}
                              disabled={locationsState !== 'ready' || locations.length === 0}
                              id="newProdStockLocation"
                              onChange={(e) => {
                                setLocationId(e.target.value)
                                setLocationError(null)
                              }}
                              value={selectedLocationId}
                            >
                              <option disabled value="">
                                {locationsState === 'idle' ? 'Pick a warehouse' : locationsState === 'loading' ? 'Loading...' : locations.length === 0 ? 'No locations' : 'Select location...'}
                              </option>
                              {locations.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400 text-base">unfold_more</span>
                          </div>
                          {locationsState === 'error' && (
                            <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">error</span> Could not load.
                              <button className="font-semibold underline hover:text-rose-700" onClick={() => setLocationsReload((key) => key + 1)} type="button">
                                Retry
                              </button>
                            </p>
                          )}
                          {locationsState === 'ready' && locations.length === 0 && <p className="text-[11px] text-slate-500 mt-1">This warehouse has no active locations.</p>}
                          {locationError && (
                            <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1" id="stockLocationErrorMsg">
                              <span className="material-symbols-outlined text-[13px]">error</span> {locationError}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500 leading-tight">{"Recorded as an 'Opening stock' adjustment in the stock ledger."}</p>
                  </div>
                  {/* Reorder Level */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700" htmlFor="newProdReorderLevel">Reorder Level</label>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">Alert Trigger</span>
                    </div>
                    <input className="w-full px-3.5 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" id="newProdReorderLevel" min="0" onChange={(e) => setReorderLevel(nonNegative(e))} placeholder="0" step="any" type="number" value={reorderLevel} />
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
                <button className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70" disabled={isSubmitting} id="btnSubmitNewProduct" type="submit">
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
