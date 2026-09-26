import { useEffect, useRef, useState } from 'react'
import { getAvailableStock } from '../../../api/inventory.ts'
import { listProducts } from '../../../api/products.ts'
import { checkTransferAvailability, confirmTransfer, createTransfer, updateTransfer, type TransferInput } from '../../../api/transfers.ts'
import { DOCUMENT_STATUS_LABEL, type Location, type Product, type Transfer, type Warehouse } from '../../../api/types.ts'
import { listLocations, listWarehouses } from '../../../api/warehouses.ts'
import { useToast } from '../../../context/toast.ts'
import { errorMessage, formatQty } from '../../products/productsData.ts'
import { isoDay, linesLabel, shortLineCount, transferDateInput, type SelectOption } from '../data.ts'

const LOCATION_WARNING = 'p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2'
const STOCK_WARNING = 'p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5'

interface LocationSelectProps {
  id: string
  label: string
  placeholder: string
  options: SelectOption[]
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}

function LocationSelect({ id, label, placeholder, options, value, disabled, onChange }: LocationSelectProps) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-600 mb-1" htmlFor={id}>
        {label}
      </label>
      <select
        className="w-full bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 font-medium cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
        disabled={disabled}
        id={id}
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface Line {
  key: number
  productId: string
  quantity: string
}

/** Product details for a line: from the active product list, or the transfer being edited */
interface LineProduct {
  name: string
  sku: string
  unitOfMeasure: string
}

interface NewTransferModalProps {
  /** Transfer being edited (DRAFT / WAITING), or null for a new one */
  editing: Transfer | null
  onClose: () => void
  /** Something was saved: refetch the list */
  onSaved: () => void
}

/** Adds the current value as an option when it isn't in the list (e.g. an inactive pick on an edited transfer) */
function withCurrent(options: SelectOption[], value: string, label: string | undefined, loaded = true): SelectOption[] {
  if (!value || !label || options.some((o) => o.value === value)) return options
  return [...options, { value, label: loaded ? `${label} (inactive)` : label }]
}

// Create / edit internal transfer modal (mounted only while open, so every opening starts fresh)
export function NewTransferModal({ editing, onClose, onSaved }: NewTransferModalProps) {
  const { showToast } = useToast()

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [pickersReady, setPickersReady] = useState(false)
  const [pickersError, setPickersError] = useState<string | null>(null)
  const [pickersKey, setPickersKey] = useState(0)

  /** Set once the transfer exists, so a retry updates instead of creating a duplicate */
  const [savedId, setSavedId] = useState<string | null>(editing?.id ?? null)
  const [srcW, setSrcW] = useState(editing?.sourceWarehouse.id ?? '')
  const [srcL, setSrcL] = useState(editing?.sourceLocation.id ?? '')
  const [dstW, setDstW] = useState(editing?.destinationWarehouse.id ?? '')
  const [dstL, setDstL] = useState(editing?.destinationLocation.id ?? '')
  const [transferDate, setTransferDate] = useState(editing ? transferDateInput(editing.transferDate) : isoDay(new Date()))
  const [lines, setLines] = useState<Line[]>(() =>
    editing && editing.items.length > 0 ? editing.items.map((item, index) => ({ key: index, productId: item.productId, quantity: String(item.quantity) })) : [{ key: 0, productId: '', quantity: '' }],
  )
  const nextKey = useRef(Math.max(1, editing?.items.length ?? 1))
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState<'draft' | 'confirm' | null>(null)

  // Available stock at the source, keyed by "productId|locationId"
  const [available, setAvailable] = useState<Record<string, number | 'error'>>({})
  const requested = useRef(new Set<string>())

  // Pickers: active warehouses, locations and products
  useEffect(() => {
    let cancelled = false
    Promise.all([listWarehouses({ status: 'ACTIVE', limit: 100 }), listLocations({ status: 'ACTIVE' }), listProducts({ status: 'ACTIVE', limit: 100 })])
      .then(([warehouseRes, locationRes, productRes]) => {
        if (cancelled) return
        setWarehouses(warehouseRes.data)
        setLocations(locationRes)
        setProducts(productRes.data)
        setPickersError(null)
        setPickersReady(true)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setPickersError(errorMessage(err, 'Could not load warehouses, locations and products.'))
        setPickersReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [pickersKey])

  // Live availability at the source for each picked product
  const productKey = lines.map((line) => line.productId).join(',')
  useEffect(() => {
    if (!srcL) return
    const ids = new Set(productKey.split(',').filter(Boolean))
    for (const productId of ids) {
      const key = `${productId}|${srcL}`
      if (requested.current.has(key)) continue
      requested.current.add(key)
      getAvailableStock(productId, srcL)
        .then((res) => setAvailable((prev) => ({ ...prev, [key]: res.quantity })))
        .catch(() => setAvailable((prev) => ({ ...prev, [key]: 'error' })))
    }
  }, [srcL, productKey])

  const editedItems = new Map((editing?.items ?? []).map((item) => [item.productId, item]))
  const productsById = new Map(products.map((p) => [p.id, p]))

  function lineProduct(productId: string): LineProduct | null {
    const product = productsById.get(productId)
    if (product) return product
    const item = editedItems.get(productId)
    return item ? { name: item.productName, sku: item.sku, unitOfMeasure: item.unitOfMeasure } : null
  }

  const warehouseOptions: SelectOption[] = warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }))
  const srcWarehouseOptions = withCurrent(warehouseOptions, srcW, editing?.sourceWarehouse.id === srcW ? editing?.sourceWarehouse.name : undefined, pickersReady)
  const dstWarehouseOptions = withCurrent(warehouseOptions, dstW, editing?.destinationWarehouse.id === dstW ? editing?.destinationWarehouse.name : undefined, pickersReady)
  const locationOptionsFor = (warehouseId: string): SelectOption[] => locations.filter((l) => l.warehouse.id === warehouseId).map((l) => ({ value: l.id, label: `${l.name} (${l.code})` }))
  const srcLocationOptions = withCurrent(locationOptionsFor(srcW), srcL, editing?.sourceLocation.id === srcL ? editing?.sourceLocation.name : undefined, pickersReady)
  const dstLocationOptions = withCurrent(locationOptionsFor(dstW), dstL, editing?.destinationLocation.id === dstL ? editing?.destinationLocation.name : undefined, pickersReady)

  const sameLocation = srcL !== '' && srcL === dstL
  const labelOf = (options: SelectOption[], value: string) => options.find((o) => o.value === value)?.label ?? ''
  const srcLocationName = labelOf(srcLocationOptions, srcL)

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
    setFormError(null)
  }

  function addLine() {
    const key = nextKey.current++
    setLines((current) => [...current, { key, productId: '', quantity: '' }])
  }

  function removeLine(key: number) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.key !== key) : [{ key: nextKey.current++, productId: '', quantity: '' }]))
  }

  /** The API payload, or a message saying what's missing */
  function buildInput(): TransferInput | string {
    if (!srcW || !srcL) return 'Pick a source warehouse and location.'
    if (!dstW || !dstL) return 'Pick a destination warehouse and location.'
    if (sameLocation) return 'Source and destination locations must be different.'
    if (!transferDate) return 'Pick a transfer date.'
    const filled = lines.filter((line) => line.productId || line.quantity.trim())
    if (filled.length === 0) return 'Add at least one product line.'
    const items: TransferInput['items'] = []
    for (const line of filled) {
      if (!line.productId) return 'Pick a product on every line.'
      const quantity = Number(line.quantity)
      if (!line.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) return `Enter a quantity above 0 for ${lineProduct(line.productId)?.name ?? 'every line'}.`
      items.push({ productId: line.productId, quantity })
    }
    if (new Set(items.map((item) => item.productId)).size !== items.length) return 'Each product can only appear once. Combine the quantities into one line.'
    return { sourceWarehouseId: srcW, sourceLocationId: srcL, destinationWarehouseId: dstW, destinationLocationId: dstL, transferDate, items }
  }

  async function save(confirm: boolean) {
    const input = buildInput()
    if (typeof input === 'string') {
      setFormError(input)
      return
    }
    setSaving(confirm ? 'confirm' : 'draft')
    setFormError(null)
    let saved: Transfer
    try {
      saved = savedId ? await updateTransfer(savedId, input) : await createTransfer(input)
      setSavedId(saved.id)
    } catch (err) {
      setFormError(errorMessage(err, 'Could not save the transfer. Please try again.'))
      setSaving(null)
      return
    }
    if (!confirm) {
      showToast(editing ? 'Transfer Updated' : 'Draft Saved', `${saved.reference} saved (${DOCUMENT_STATUS_LABEL[saved.status]}).`)
      onSaved()
      onClose()
      return
    }
    try {
      // A WAITING transfer is re-checked; a DRAFT is confirmed
      const result = saved.status === 'WAITING' ? await checkTransferAvailability(saved.id) : await confirmTransfer(saved.id)
      if (result.status === 'READY') showToast('Transfer Ready', `${result.reference} is ready to validate.`)
      else showToast('Transfer Waiting', `${result.reference} is waiting: the source is short on ${linesLabel(shortLineCount(result))}.`)
      onSaved()
      onClose()
    } catch (err) {
      setFormError(`${saved.reference} was saved but not confirmed: ${errorMessage(err, 'please try again.')}`)
      onSaved()
    } finally {
      setSaving(null)
    }
  }

  function close() {
    if (saving) return
    onClose()
  }

  // Summary of the first line + route
  const filledLines = lines.filter((line) => line.productId && Number(line.quantity) > 0)
  const firstLine = filledLines[0]
  const firstProduct = firstLine ? lineProduct(firstLine.productId) : null
  const moveText = firstLine && firstProduct ? `${formatQty(Number(firstLine.quantity))} ${firstProduct.unitOfMeasure} ${firstProduct.name}${filledLines.length > 1 ? ` +${filledLines.length - 1} more` : ''}` : 'No products yet'
  const routeText = `${labelOf(srcWarehouseOptions, srcW) || 'Source'} / ${srcLocationName || '—'} → ${labelOf(dstWarehouseOptions, dstW) || 'Destination'} / ${labelOf(dstLocationOptions, dstL) || '—'}`
  const isWaitingEdit = editing?.status === 'WAITING'
  const usedProducts = new Set(lines.map((line) => line.productId).filter(Boolean))

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4" id="newTransferModal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">{editing ? `Edit Transfer ${editing.reference}` : 'New Internal Transfer'}</h3>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60">{editing ? DOCUMENT_STATUS_LABEL[editing.status] : '/transfers/new'}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Move stock between internal locations. Total stock across nodes stays constant.</p>
          </div>
          <button className="w-8 h-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors" onClick={close} type="button">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs max-h-[75vh]">
          {pickersError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
                {pickersError}
              </span>
              <button className="font-semibold hover:text-rose-900" onClick={() => setPickersKey((k) => k + 1)} type="button">
                Retry
              </button>
            </div>
          )}
          {pickersReady && !pickersError && warehouses.length === 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-amber-600">info</span>
              <span>No active warehouses yet. Create a warehouse with locations before making a transfer.</span>
            </div>
          )}
          {/* Location Picker Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            {/* Source Panel */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <span className="material-symbols-outlined text-[16px] text-slate-500">upload</span>
                Source Node &amp; Location
              </div>
              <LocationSelect
                id="modalSourceWarehouse"
                label="Source Warehouse"
                onChange={(v) => {
                  setSrcW(v)
                  setSrcL('')
                  setFormError(null)
                }}
                options={srcWarehouseOptions}
                placeholder={pickersReady ? 'Select warehouse' : 'Loading...'}
                value={srcW}
              />
              <LocationSelect
                disabled={!srcW}
                id="modalSourceLocation"
                label="Source Internal Location"
                onChange={(v) => {
                  setSrcL(v)
                  setFormError(null)
                }}
                options={srcLocationOptions}
                placeholder={srcW && srcLocationOptions.length === 0 ? 'No active locations' : 'Select location'}
                value={srcL}
              />
            </div>
            {/* Destination Panel */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <span className="material-symbols-outlined text-[16px] text-indigo-600">download</span>
                Destination Node &amp; Location
              </div>
              <LocationSelect
                id="modalDestWarehouse"
                label="Destination Warehouse"
                onChange={(v) => {
                  setDstW(v)
                  setDstL('')
                  setFormError(null)
                }}
                options={dstWarehouseOptions}
                placeholder={pickersReady ? 'Select warehouse' : 'Loading...'}
                value={dstW}
              />
              <LocationSelect
                disabled={!dstW}
                id="modalDestLocation"
                label="Destination Internal Location"
                onChange={(v) => {
                  setDstL(v)
                  setFormError(null)
                }}
                options={dstLocationOptions}
                placeholder={dstW && dstLocationOptions.length === 0 ? 'No active locations' : 'Select location'}
                value={dstL}
              />
            </div>
          </div>
          {/* Realtime Location Validation Error */}
          {sameLocation && (
            <div className={LOCATION_WARNING} id="locationWarning">
              <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
              <span>Source and destination locations cannot be identical. Please pick distinct internal locations.</span>
            </div>
          )}
          {/* Transfer Date */}
          <div className="max-w-[220px]">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1" htmlFor="modalTransferDate">
              Transfer Date
            </label>
            <input
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
              id="modalTransferDate"
              onChange={(e) => setTransferDate(e.target.value)}
              type="date"
              value={transferDate}
            />
          </div>
          {/* Product Line Selector Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">Transfer Items &amp; Stock Availability</span>
              <span className="font-mono text-[11px] text-slate-400">{srcL ? `Live stock at ${srcLocationName}` : 'Pick a source location to see stock'}</span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 font-semibold text-[10px] text-slate-400 uppercase tracking-wider px-2">
                <div className="col-span-5">Product &amp; SKU</div>
                <div className="col-span-2 text-right">Available at Source</div>
                <div className="col-span-1 text-center">Unit</div>
                <div className="col-span-3 text-right">Transfer Qty</div>
                <div className="col-span-1" />
              </div>
              {pickersReady && !pickersError && products.length === 0 && !editing && <div className="px-2 py-3 text-[11px] text-slate-500">No active products yet. Create products before making a transfer.</div>}
              {lines.map((line) => {
                const product = line.productId ? lineProduct(line.productId) : null
                const stock = line.productId && srcL ? available[`${line.productId}|${srcL}`] : undefined
                const quantity = Number(line.quantity)
                const exceeds = typeof stock === 'number' && quantity > 0 && quantity > stock
                const productOptions = products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))
                const options = withCurrent(productOptions, line.productId, editedItems.get(line.productId)?.productName, pickersReady)
                return (
                  <div className="space-y-1.5" key={line.key}>
                    <div className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <div className="col-span-5">
                        <select
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs px-2 py-1 rounded focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                          onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                          value={line.productId}
                        >
                          <option value="">{pickersReady ? 'Select product' : 'Loading...'}</option>
                          {options.map((option) => (
                            <option disabled={option.value !== line.productId && usedProducts.has(option.value)} key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {product && <div className="font-mono text-[10px] text-slate-400 mt-0.5 pl-0.5">SKU: {product.sku}</div>}
                      </div>
                      <div className="col-span-2 text-right">
                        {!line.productId || !srcL ? (
                          <div className="font-mono text-slate-400">—</div>
                        ) : stock === undefined ? (
                          <div className="font-mono text-slate-400">...</div>
                        ) : stock === 'error' ? (
                          <div className="font-mono text-slate-400" title="Could not load stock">n/a</div>
                        ) : (
                          <div className={exceeds || stock === 0 ? 'font-mono font-bold text-rose-600' : 'font-mono font-bold text-emerald-700'}>{formatQty(stock)}</div>
                        )}
                      </div>
                      <div className="col-span-1 text-center font-mono text-slate-500">{product?.unitOfMeasure ?? '—'}</div>
                      <div className="col-span-3 text-right">
                        <input
                          className="w-full text-right font-mono font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
                          min="0"
                          onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                          placeholder="0"
                          step="any"
                          type="number"
                          value={line.quantity}
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <button className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" onClick={() => removeLine(line.key)} title="Remove line" type="button">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                    {/* Stock Exceeded Warning (the backend decides at validation) */}
                    {exceeds && product && (
                      <div className={STOCK_WARNING}>
                        <span className="material-symbols-outlined text-[15px] text-amber-600">warning</span>
                        <span>{`Only ${formatQty(stock)} ${product.unitOfMeasure} available at ${srcLocationName}. You can still save; the transfer waits until the source has enough stock.`}</span>
                      </div>
                    )}
                  </div>
                )
              })}
              <button className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1" onClick={addLine} type="button">
                <span className="material-symbols-outlined text-[15px]">add</span>
                Add product line
              </button>
            </div>
          </div>
          {/* Transfer Overview Summary Card */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-3 text-xs text-indigo-950">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-indigo-600 text-lg">sync_alt</span>
              <div className="min-w-0">
                <span className="font-semibold">Move:</span> {moveText}
                <span className="text-indigo-700 font-mono block text-[11px] truncate">{routeText}</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-white text-indigo-700 border border-indigo-200/80 whitespace-nowrap">{linesLabel(filledLines.length)}</span>
          </div>
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
              <span>{formError}</span>
            </div>
          )}
        </div>
        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <button className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors disabled:opacity-50" disabled={saving !== null} onClick={close} type="button">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
              disabled={saving !== null || sameLocation}
              onClick={() => void save(false)}
              type="button"
            >
              {saving === 'draft' ? 'Saving...' : isWaitingEdit ? 'Save Changes' : 'Save Draft'}
            </button>
            <button
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-50"
              disabled={saving !== null || sameLocation}
              onClick={() => void save(true)}
              type="button"
            >
              <span className={saving === 'confirm' ? 'material-symbols-outlined text-[15px] animate-spin' : 'material-symbols-outlined text-[15px]'}>{saving === 'confirm' ? 'progress_activity' : 'verified'}</span>
              <span>{isWaitingEdit ? 'Save & Check Availability' : 'Confirm'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
