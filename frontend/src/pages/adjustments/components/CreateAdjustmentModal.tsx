import { useEffect, useState } from 'react'
import { applyAdjustment, createAdjustment, updateAdjustment } from '../../../api/adjustments.ts'
import { getAvailableStock } from '../../../api/inventory.ts'
import { listProducts } from '../../../api/products.ts'
import type { Adjustment, Location, Warehouse } from '../../../api/types.ts'
import { listLocations, listWarehouses } from '../../../api/warehouses.ts'
import { errorMessage, formatQty, useDebouncedValue } from '../../products/productsData.ts'
import { differenceTextClass, OTHER_REASON, REASON_PRESETS, signedQty } from '../data.ts'

type ProductOption = Adjustment['product']

const SELECT_CLASS = 'w-full bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 font-medium cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed'
const INPUT_CLASS = 'w-full bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 font-medium'
const LABEL_CLASS = 'block text-[11px] font-semibold text-slate-600 mb-1'
const FIELD_ERROR = 'text-[11px] text-rose-600 mt-1'

interface CreateAdjustmentModalProps {
  /** Edit this DRAFT; omitted to create a new adjustment */
  adjustment?: Adjustment | null
  /** Inventory managers can save and apply in one step */
  canApply: boolean
  onClose: () => void
  /** Saved (and applied when asked); applyError is set when the save worked but the apply failed */
  onSaved: (adjustment: Adjustment, applied: boolean, applyError: string | null) => void
}

// Create / edit a DRAFT adjustment. Remounts, and so resets, on every open.
export function CreateAdjustmentModal({ adjustment, canApply, onClose, onSaved }: CreateAdjustmentModalProps) {
  const editing = adjustment ?? null
  const presetReason = editing && REASON_PRESETS.includes(editing.reason)

  const [productSearch, setProductSearch] = useState('')
  const debouncedProductSearch = useDebouncedValue(productSearch.trim(), 300)
  const [productResult, setProductResult] = useState<{ search: string; list: ProductOption[]; error: string | null } | null>(null)
  const [product, setProduct] = useState<ProductOption | null>(editing?.product ?? null)

  const [warehouses, setWarehouses] = useState<Warehouse[] | null>(null)
  const [warehouseId, setWarehouseId] = useState(editing?.warehouse.id ?? '')
  const [locationResult, setLocationResult] = useState<{ warehouseId: string; list: Location[] } | null>(null)
  const [locationId, setLocationId] = useState(editing?.location.id ?? '')

  const [stockResult, setStockResult] = useState<{ key: string; quantity: number | null; error: string | null } | null>(null)
  const [physical, setPhysical] = useState(editing ? String(editing.physicalQuantity) : '')
  const [reasonChoice, setReasonChoice] = useState(editing ? (presetReason ? editing.reason : OTHER_REASON) : '')
  const [customReason, setCustomReason] = useState(editing && !presetReason ? editing.reason : '')
  const [notes, setNotes] = useState(editing?.notes ?? '')

  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState<'draft' | 'apply' | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Active products (server search)
  useEffect(() => {
    let cancelled = false
    listProducts({ status: 'ACTIVE', limit: 100, search: debouncedProductSearch || undefined })
      .then((res) => {
        if (!cancelled) setProductResult({ search: debouncedProductSearch, list: res.data.map((p) => ({ id: p.id, name: p.name, sku: p.sku, unitOfMeasure: p.unitOfMeasure })), error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) setProductResult({ search: debouncedProductSearch, list: [], error: errorMessage(err, 'Could not load products.') })
      })
    return () => {
      cancelled = true
    }
  }, [debouncedProductSearch])

  // Active warehouses
  useEffect(() => {
    let cancelled = false
    listWarehouses({ status: 'ACTIVE', limit: 100 })
      .then((res) => {
        if (!cancelled) setWarehouses(res.data)
      })
      .catch(() => {
        if (!cancelled) setWarehouses([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Active locations of the chosen warehouse
  useEffect(() => {
    if (!warehouseId) return
    let cancelled = false
    listLocations({ warehouseId, status: 'ACTIVE' })
      .then((list) => {
        if (!cancelled) setLocationResult({ warehouseId, list })
      })
      .catch(() => {
        if (!cancelled) setLocationResult({ warehouseId, list: [] })
      })
    return () => {
      cancelled = true
    }
  }, [warehouseId])

  // Unchanged product + location on an existing draft: the backend keeps its recorded quantity
  const keepsRecorded = Boolean(editing && product?.id === editing.product.id && locationId === editing.location.id)
  const stockKey = product && locationId && !keepsRecorded ? `${product.id}|${locationId}` : ''

  // Live system quantity for the chosen product + location
  useEffect(() => {
    if (!stockKey) return
    const [productId, locId] = stockKey.split('|')
    let cancelled = false
    getAvailableStock(productId, locId)
      .then((res) => {
        if (!cancelled) setStockResult({ key: stockKey, quantity: Number(res.quantity), error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) setStockResult({ key: stockKey, quantity: null, error: errorMessage(err, 'Could not read the current stock.') })
      })
    return () => {
      cancelled = true
    }
  }, [stockKey])

  const productsLoading = productResult?.search !== debouncedProductSearch
  const productList = productResult?.list ?? []
  const productOptions = product && !productList.some((p) => p.id === product.id) ? [product, ...productList] : productList

  const warehouseOptions = warehouses ?? []
  const editWarehouse = editing && !warehouseOptions.some((w) => w.id === editing.warehouse.id) ? editing.warehouse : null
  const locationsLoading = Boolean(warehouseId) && locationResult?.warehouseId !== warehouseId
  const locationList = locationResult?.warehouseId === warehouseId ? locationResult.list : []
  const editLocation = editing && warehouseId === editing.warehouse.id && !locationList.some((l) => l.id === editing.location.id) ? editing.location : null

  const stockLoading = Boolean(stockKey) && stockResult?.key !== stockKey
  const liveStock = stockKey && stockResult?.key === stockKey ? stockResult : null
  const recorded: number | null = keepsRecorded && editing ? editing.recordedQuantity : (liveStock?.quantity ?? null)

  const physicalValue = physical.trim() === '' ? NaN : Number(physical)
  const physicalValid = Number.isFinite(physicalValue) && physicalValue >= 0
  const difference = recorded !== null && physicalValid ? physicalValue - recorded : null
  const reason = reasonChoice === OTHER_REASON ? customReason.trim() : reasonChoice
  const unit = product?.unitOfMeasure ?? ''

  const warehouseName = warehouseOptions.find((w) => w.id === warehouseId)?.name ?? editWarehouse?.name ?? ''
  const locationName = locationList.find((l) => l.id === locationId)?.name ?? editLocation?.name ?? ''

  const isValid = Boolean(product && warehouseId && locationId && physicalValid && reason)

  function changeWarehouse(value: string) {
    setWarehouseId(value)
    setLocationId('')
  }

  function changeProduct(id: string) {
    setProduct(productOptions.find((p) => p.id === id) ?? null)
  }

  async function save(andApply: boolean) {
    setSubmitted(true)
    if (!isValid || !product || saving) return
    setSaving(andApply ? 'apply' : 'draft')
    setError(null)
    const input = { productId: product.id, warehouseId, locationId, physicalQuantity: physicalValue, reason }
    let saved: Adjustment
    try {
      saved = editing ? await updateAdjustment(editing.id, { ...input, notes: notes.trim() }) : await createAdjustment({ ...input, notes: notes.trim() || undefined })
    } catch (err) {
      setError(errorMessage(err, 'Could not save the adjustment. Please try again.'))
      setSaving(null)
      return
    }
    if (!andApply) {
      onSaved(saved, false, null)
      return
    }
    try {
      onSaved(await applyAdjustment(saved.id), true, null)
    } catch (err) {
      onSaved(saved, false, errorMessage(err, 'Could not apply the adjustment. Please try again.'))
    }
  }

  function renderRecorded() {
    if (!product || !locationId) return <span className="text-slate-400">Pick a product and location</span>
    if (stockLoading) return <span className="text-slate-400">Reading stock...</span>
    if (liveStock?.error) return <span className="text-rose-600">{liveStock.error}</span>
    if (recorded === null) return <span className="text-slate-400">—</span>
    return (
      <span className="font-mono font-bold text-slate-900">
        {formatQty(recorded)} {unit}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4" id="newAdjustmentModal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">{editing ? 'Edit Inventory Adjustment' : 'New Inventory Adjustment'}</h3>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60">{editing ? editing.reference : '/adjustments/new'}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Record a physical count. The system quantity is read from current stock; applying sets stock to your count.</p>
          </div>
          <button className="w-8 h-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50" disabled={saving !== null} onClick={onClose} type="button">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Panel */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <span className="material-symbols-outlined text-[16px] text-slate-500">inventory_2</span>
                Product
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="adjProductSearch">
                  Search products
                </label>
                <input className={INPUT_CLASS} id="adjProductSearch" onChange={(e) => setProductSearch(e.target.value)} placeholder="Name or SKU..." type="text" value={productSearch} />
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="adjProduct">
                  Product *
                </label>
                <select className={SELECT_CLASS} id="adjProduct" onChange={(e) => changeProduct(e.target.value)} value={product?.id ?? ''}>
                  <option value="">{productsLoading ? 'Loading products...' : productOptions.length === 0 ? 'No active products found' : 'Select a product'}</option>
                  {productOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
                {productResult?.error && <p className={FIELD_ERROR}>{productResult.error}</p>}
                {submitted && !product && <p className={FIELD_ERROR}>Choose a product.</p>}
              </div>
            </div>
            {/* Location Panel */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <span className="material-symbols-outlined text-[16px] text-indigo-600">warehouse</span>
                Counted At
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="adjWarehouse">
                  Warehouse *
                </label>
                <select className={SELECT_CLASS} id="adjWarehouse" onChange={(e) => changeWarehouse(e.target.value)} value={warehouseId}>
                  <option value="">{warehouses === null ? 'Loading warehouses...' : warehouseOptions.length === 0 && !editWarehouse ? 'No active warehouses' : 'Select a warehouse'}</option>
                  {editWarehouse && <option value={editWarehouse.id}>{editWarehouse.name}</option>}
                  {warehouseOptions.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
                {submitted && !warehouseId && <p className={FIELD_ERROR}>Choose a warehouse.</p>}
              </div>
              <div>
                <label className={LABEL_CLASS} htmlFor="adjLocation">
                  Location *
                </label>
                <select className={SELECT_CLASS} disabled={!warehouseId} id="adjLocation" onChange={(e) => setLocationId(e.target.value)} value={locationId}>
                  <option value="">{!warehouseId ? 'Pick a warehouse first' : locationsLoading ? 'Loading locations...' : locationList.length === 0 && !editLocation ? 'No active locations' : 'Select a location'}</option>
                  {editLocation && <option value={editLocation.id}>{editLocation.name}</option>}
                  {locationList.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>
                {submitted && warehouseId && !locationId && <p className={FIELD_ERROR}>Choose a location.</p>}
              </div>
            </div>
          </div>

          {/* Count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">Physical Count</span>
              <span className="font-mono text-[11px] text-slate-400">{keepsRecorded ? 'Recorded when drafted' : 'Live stock check'}</span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Recorded (system)</div>
                <div className="text-sm">{renderRecorded()}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1" htmlFor="adjPhysical">
                  Physical count * {unit && <span className="normal-case">({unit})</span>}
                </label>
                <input className="w-full text-right font-mono font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:border-indigo-500 text-xs" id="adjPhysical" min="0" onChange={(e) => setPhysical(e.target.value)} placeholder="0" step="any" type="number" value={physical} />
                {submitted && !physicalValid && <p className={FIELD_ERROR}>Enter a count of 0 or more.</p>}
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Difference</div>
                <div className={difference === null ? 'text-sm text-slate-400' : `text-sm font-mono font-bold ${differenceTextClass(difference)}`}>{difference === null ? '—' : `${signedQty(difference)} ${unit}`}</div>
              </div>
            </div>
          </div>

          {/* Reason & notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS} htmlFor="adjReason">
                Reason *
              </label>
              <select className={SELECT_CLASS} id="adjReason" onChange={(e) => setReasonChoice(e.target.value)} value={reasonChoice}>
                <option value="">Select a reason</option>
                {REASON_PRESETS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                <option value={OTHER_REASON}>Other (type a reason)</option>
              </select>
              {reasonChoice === OTHER_REASON && <input className={`${INPUT_CLASS} mt-2`} maxLength={255} onChange={(e) => setCustomReason(e.target.value)} placeholder="Describe the reason..." type="text" value={customReason} />}
              {submitted && !reason && <p className={FIELD_ERROR}>A reason is required.</p>}
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="adjNotes">
                Notes
              </label>
              <textarea className={`${INPUT_CLASS} min-h-[72px] resize-y`} id="adjNotes" maxLength={2000} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details (who counted, what was found...)" value={notes} />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Summary */}
          {product && locationId && physicalValid && (
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs text-indigo-950">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-lg">tune</span>
                <div>
                  <span className="font-semibold">Set:</span> {product.name} to {formatQty(physicalValue)} {unit}
                  <span className="text-indigo-700 font-mono block text-[11px]">
                    {warehouseName} / {locationName}
                  </span>
                </div>
              </div>
              {difference !== null && <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-white border border-indigo-200/80 ${differenceTextClass(difference)}`}>{signedQty(difference)}</span>}
            </div>
          )}
        </div>
        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <button className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors disabled:opacity-50" disabled={saving !== null} onClick={onClose} type="button">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button className={canApply ? 'px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-xs transition-all disabled:opacity-50' : 'px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-50'} disabled={saving !== null} onClick={() => void save(false)} type="button">
              {saving === 'draft' ? 'Saving...' : editing ? 'Save Changes' : 'Save Draft'}
            </button>
            {canApply && (
              <button className="px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-50" disabled={saving !== null} onClick={() => void save(true)} type="button">
                <span className={saving === 'apply' ? 'material-symbols-outlined text-[15px] animate-spin' : 'material-symbols-outlined text-[15px]'}>{saving === 'apply' ? 'progress_activity' : 'verified'}</span>
                <span>{saving === 'apply' ? 'Applying...' : 'Save & Apply'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
