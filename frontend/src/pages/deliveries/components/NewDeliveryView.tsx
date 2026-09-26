import { Fragment, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../../../api/client.ts'
import { confirmDelivery, createCustomer, createDelivery, getDelivery, listCustomers, updateDelivery } from '../../../api/deliveries.ts'
import { getAvailableStock } from '../../../api/inventory.ts'
import { listProducts } from '../../../api/products.ts'
import type { Customer, Delivery, Location as StockLocation, Product, Warehouse } from '../../../api/types.ts'
import { listLocations, listWarehouses } from '../../../api/warehouses.ts'
import { useToast } from '../../../context/toast.ts'
import { ROUTES } from '../../../routes.ts'
import { errorMessage, formatQty, isUuid, useDebouncedValue } from '../../products/productsData.ts'
import { parseQty, withCurrent, type SelectOption } from '../../receipts/new/data.ts'
import { deliveryFormKey, emptyDeliveryForm, formFromDelivery, isEditableStatus, linesLabel, toDeliveryInput, type DeliveryForm, type DeliveryLine } from '../data.ts'

const SELECT_CLASS = 'w-full py-2 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-label-md focus:outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed'
const QTY_INPUT = 'w-24 text-right py-1 px-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
/** Classes added to an over-limit / invalid qty input */
const QTY_INPUT_OVER = 'border-rose-500 bg-rose-50/40'
const GUIDE_LINK = 'font-semibold text-indigo-600 hover:text-indigo-800 underline'

type ListState = 'loading' | 'ready' | 'error'
type BusyAction = 'save' | 'confirm'
/** Stock at the source location per `${productId}|${locationId}`: a number, or 'error' when the lookup failed */
type StockMap = Record<string, number | 'error'>

const warehouseLabel = (warehouse: { name: string; code: string }) => `${warehouse.name} (${warehouse.code})`
const locationLabel = (location: { name: string; code: string }) => `${location.name} (${location.code})`
const stockKey = (productId: string, locationId: string) => `${productId}|${locationId}`

interface NewDeliveryViewProps {
  /** null creates a new delivery; an id edits that DRAFT / WAITING delivery */
  id: string | null
  onClose: () => void
  onOpenDetail: (id: string) => void
}

// VIEW 2: CREATE / EDIT DELIVERY ORDER
export function NewDeliveryView({ id, onClose, onOpenDetail }: NewDeliveryViewProps) {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'notfound'>(id === null ? 'ready' : isUuid(id) ? 'loading' : 'notfound')
  const [loadError, setLoadError] = useState('')
  const [loadKey, setLoadKey] = useState(0)
  const [form, setForm] = useState<DeliveryForm>(emptyDeliveryForm)

  const [busyAction, setBusyAction] = useState<BusyAction | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)

  // Pickers (active records only); bumping listsReload refetches all of them
  const [listsReload, setListsReload] = useState(0)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customersState, setCustomersState] = useState<ListState>('loading')
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehousesState, setWarehousesState] = useState<ListState>('loading')
  const [locationsFor, setLocationsFor] = useState<{ warehouseId: string; state: ListState; data: StockLocation[] }>({ warehouseId: '', state: 'loading', data: [] })
  const [productSearch, setProductSearch] = useState('')
  const debouncedSearch = useDebouncedValue(productSearch.trim(), 300)
  const [products, setProducts] = useState<Product[]>([])
  const [productsState, setProductsState] = useState<ListState>('loading')
  const [stock, setStock] = useState<StockMap>({})
  const requestedStock = useRef(new Set<string>())

  // Inline "new customer" form
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerCode, setNewCustomerCode] = useState('')
  const [newCustomerError, setNewCustomerError] = useState<string | null>(null)
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)

  // Delivery being edited
  useEffect(() => {
    if (id === null || !isUuid(id)) return
    let cancelled = false
    getDelivery(id)
      .then((res) => {
        if (cancelled) return
        setDelivery(res)
        setForm(formFromDelivery(res))
        // The lines' current availability at the source location comes with the delivery
        const seeded: StockMap = {}
        for (const item of res.items) seeded[stockKey(item.productId, res.sourceLocation.id)] = Number(item.available)
        setStock((prev) => ({ ...prev, ...seeded }))
        setLoadState('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
          setLoadState('notfound')
        } else {
          setLoadError(errorMessage(err, 'Could not load this delivery. Please try again.'))
          setLoadState('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, loadKey])

  useEffect(() => {
    let cancelled = false
    listCustomers({ status: 'ACTIVE' })
      .then((res) => {
        if (cancelled) return
        setCustomers([...res].sort((a, b) => a.name.localeCompare(b.name)))
        setCustomersState('ready')
        // Nothing to pick from yet: open the inline form right away
        if (res.length === 0) setShowNewCustomer(true)
      })
      .catch(() => {
        if (!cancelled) setCustomersState('error')
      })
    return () => {
      cancelled = true
    }
  }, [listsReload])

  useEffect(() => {
    let cancelled = false
    listWarehouses({ status: 'ACTIVE', limit: 100 })
      .then((res) => {
        if (cancelled) return
        setWarehouses(res.data)
        setWarehousesState('ready')
        // A single warehouse is preselected on a new delivery
        if (id === null && res.data.length === 1) setForm((prev) => (prev.warehouseId ? prev : { ...prev, warehouseId: res.data[0].id, sourceLocationId: '' }))
      })
      .catch(() => {
        if (!cancelled) setWarehousesState('error')
      })
    return () => {
      cancelled = true
    }
  }, [id, listsReload])

  const warehouseId = form.warehouseId
  useEffect(() => {
    if (!warehouseId) return
    let cancelled = false
    listLocations({ warehouseId, status: 'ACTIVE' })
      .then((res) => {
        if (cancelled) return
        setLocationsFor({ warehouseId, state: 'ready', data: res })
        // A warehouse with a single location gets it preselected
        if (res.length === 1) setForm((prev) => (prev.warehouseId === warehouseId && !prev.sourceLocationId ? { ...prev, sourceLocationId: res[0].id } : prev))
      })
      .catch(() => {
        if (!cancelled) setLocationsFor({ warehouseId, state: 'error', data: [] })
      })
    return () => {
      cancelled = true
    }
  }, [warehouseId, listsReload])

  useEffect(() => {
    let cancelled = false
    listProducts({ status: 'ACTIVE', limit: 100, search: debouncedSearch || undefined })
      .then((res) => {
        if (cancelled) return
        setProducts(res.data)
        setProductsState('ready')
      })
      .catch(() => {
        if (!cancelled) setProductsState('error')
      })
    return () => {
      cancelled = true
    }
  }, [debouncedSearch, listsReload])

  // Live stock of each line at the chosen source location (advisory: the backend decides at validation)
  const sourceLocationId = form.sourceLocationId
  const lineProductIds = form.lines.map((line) => line.productId).join(',')
  useEffect(() => {
    if (!sourceLocationId || !lineProductIds) return
    for (const productId of lineProductIds.split(',')) {
      const key = stockKey(productId, sourceLocationId)
      if (requestedStock.current.has(key)) continue
      requestedStock.current.add(key)
      getAvailableStock(productId, sourceLocationId)
        .then((res) => setStock((prev) => ({ ...prev, [key]: Number(res.quantity) })))
        .catch(() => {
          requestedStock.current.delete(key)
          setStock((prev) => ({ ...prev, [key]: 'error' }))
        })
    }
  }, [sourceLocationId, lineProductIds])

  const locationsState: ListState = locationsFor.warehouseId === form.warehouseId ? locationsFor.state : 'loading'
  const locations = locationsFor.warehouseId === form.warehouseId ? locationsFor.data : []

  if (loadState === 'loading') {
    return (
      <div className="flex flex-col pt-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 shadow-xs text-center text-xs text-slate-500">
          <span className="material-symbols-outlined text-[22px] text-slate-400 animate-spin block mx-auto mb-2 w-fit">progress_activity</span>
          Loading delivery...
        </div>
      </div>
    )
  }

  if (loadState === 'notfound' || loadState === 'error') {
    return (
      <div className="flex flex-col pt-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-12 text-center max-w-lg mx-auto my-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2 border border-rose-100">
            <span className="material-symbols-outlined text-3xl">{loadState === 'notfound' ? 'search_off' : 'cloud_off'}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{loadState === 'notfound' ? 'Delivery not found' : 'Couldn’t load this delivery'}</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">{loadState === 'notfound' ? 'It may have been removed, or the link is wrong.' : loadError}</p>
          <div className="pt-3 flex items-center justify-center gap-2.5">
            <button className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors" onClick={onClose}>
              Back to Deliveries
            </button>
            {loadState === 'error' && (
              <button
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
                onClick={() => {
                  setLoadState('loading')
                  setLoadKey((key) => key + 1)
                }}
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Only DRAFT / WAITING deliveries can be edited
  if (delivery && !isEditableStatus(delivery.status)) {
    return (
      <div className="flex flex-col pt-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-12 text-center max-w-lg mx-auto my-8 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">{`${delivery.reference} can no longer be edited`}</h2>
          <p className="text-xs text-slate-500">Only Draft and Waiting deliveries can change.</p>
          <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all" onClick={() => onOpenDetail(delivery.id)}>
            View Delivery
          </button>
        </div>
      </div>
    )
  }

  const lines = form.lines
  const isBusy = busyAction !== null
  const isDirty = delivery ? deliveryFormKey(form) !== deliveryFormKey(formFromDelivery(delivery)) : Boolean(form.customerId) || lines.length > 0
  const invalidCount = lines.filter((line) => parseQty(line.qty) === null).length
  const totalQty = lines.reduce((sum, line) => sum + (parseQty(line.qty) ?? 0), 0)
  const units = new Set(lines.map((line) => line.unit))
  const totalUnit = units.size === 1 ? [...units][0] : 'units'

  function lineStock(line: DeliveryLine): number | 'error' | 'loading' | null {
    if (!form.sourceLocationId) return null
    return stock[stockKey(line.productId, form.sourceLocationId)] ?? 'loading'
  }
  const overLines = lines.filter((line) => {
    const available = lineStock(line)
    const qty = parseQty(line.qty)
    return typeof available === 'number' && qty !== null && qty > available
  })

  // Select options: active records, plus the delivery's current value if it's no longer active
  const customerOptions = withCurrent(
    customers.map((customer) => ({ id: customer.id, label: customer.code ? `${customer.name} (${customer.code})` : customer.name })),
    delivery && form.customerId === delivery.customer.id ? { id: delivery.customer.id, label: `${delivery.customer.name}${delivery.customer.status === 'ACTIVE' ? '' : ' (inactive)'}` } : null,
  )
  const warehouseOptions = withCurrent(
    warehouses.map((warehouse) => ({ id: warehouse.id, label: warehouseLabel(warehouse) })),
    delivery && form.warehouseId === delivery.warehouse.id ? { id: delivery.warehouse.id, label: warehouseLabel(delivery.warehouse) } : null,
  )
  const locationOptions = withCurrent(
    locations.map((item) => ({ id: item.id, label: locationLabel(item) })),
    delivery && form.warehouseId === delivery.warehouse.id && form.sourceLocationId === delivery.sourceLocation.id ? { id: delivery.sourceLocation.id, label: locationLabel(delivery.sourceLocation) } : null,
  )
  const optionLabel = (options: SelectOption[], value: string) => options.find((option) => option.id === value)?.label ?? null
  const selectedWarehouse = optionLabel(warehouseOptions, form.warehouseId)
  const selectedLocation = optionLabel(locationOptions, form.sourceLocationId)
  const locationName = locations.find((item) => item.id === form.sourceLocationId)?.name ?? (delivery?.sourceLocation.id === form.sourceLocationId ? delivery.sourceLocation.name : 'the source location')

  function updateForm(patch: Partial<DeliveryForm>) {
    setForm((prev) => ({ ...prev, ...patch }))
    setActionError(null)
  }

  function updateLines(update: (lines: DeliveryLine[]) => DeliveryLine[]) {
    setForm((prev) => ({ ...prev, lines: update(prev.lines) }))
    setActionError(null)
  }

  function leave() {
    if (isDirty && !window.confirm('Leave this delivery? Your unsaved changes will be lost.')) return
    onClose()
  }

  function leaveTo(path: string) {
    if (isDirty && !window.confirm('Leave this delivery? Your unsaved changes will be lost.')) return
    navigate(path)
  }

  /** Client-side checks mirroring the backend rules; returns the first problem */
  function formProblem(): string | null {
    if (!form.customerId) return 'Choose a customer for this delivery.'
    if (!form.warehouseId) return 'Choose the warehouse the goods ship from.'
    if (!form.sourceLocationId) return 'Choose the source location.'
    if (!form.deliveryDate) return 'Enter the delivery date.'
    if (lines.length === 0) return 'Add at least one product line.'
    if (invalidCount > 0) return 'Every line needs a quantity greater than 0 (up to 3 decimals).'
    return null
  }

  async function run(action: BusyAction, work: () => Promise<void>, fallback: string) {
    const problem = formProblem()
    if (problem) {
      setActionError(problem)
      return
    }
    setBusyAction(action)
    setActionError(null)
    try {
      await work()
    } catch (err) {
      setActionError(errorMessage(err, fallback))
      // An inactive customer / warehouse / location / product: refresh the pickers
      if (err instanceof ApiError && (err.status === 400 || err.status === 404)) setListsReload((key) => key + 1)
    } finally {
      setBusyAction(null)
    }
  }

  /** Creates the delivery or saves pending edits; returns the saved delivery */
  async function save(): Promise<Delivery> {
    const input = toDeliveryInput(form)
    if (!delivery) return createDelivery(input)
    if (!isDirty) return delivery
    return updateDelivery(delivery.id, input)
  }

  function handleSave() {
    void run(
      'save',
      async () => {
        const saved = await save()
        showToast(delivery ? 'Delivery Saved' : 'Draft Saved', `${saved.reference} saved with ${linesLabel(saved.lineCount)}. No stock moved.`)
        onOpenDetail(saved.id)
      },
      'Could not save the delivery. Please try again.',
    )
  }

  function handleConfirm() {
    void run(
      'confirm',
      async () => {
        const saved = await save()
        try {
          const confirmed = await confirmDelivery(saved.id)
          if (confirmed.status === 'READY') showToast('Delivery Confirmed', `${confirmed.reference} is ready: every line is in stock.`)
          else showToast('Delivery Waiting', `${confirmed.reference} is waiting: some lines are short on stock.`)
        } catch (err) {
          // Saved but not confirmed: continue from the saved draft
          showToast('Saved as Draft', `${saved.reference} was saved but not confirmed: ${errorMessage(err)}`)
        }
        onOpenDetail(saved.id)
      },
      'Could not save the delivery. Please try again.',
    )
  }

  async function handleCreateCustomer() {
    const name = newCustomerName.trim()
    const code = newCustomerCode.trim()
    if (!name) {
      setNewCustomerError('Customer name is required.')
      return
    }
    setIsCreatingCustomer(true)
    setNewCustomerError(null)
    try {
      const created = await createCustomer({ name, ...(code ? { code } : {}) })
      setCustomers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      updateForm({ customerId: created.id })
      setNewCustomerName('')
      setNewCustomerCode('')
      setShowNewCustomer(false)
      showToast('Customer Created', `${created.name} is ready to use.`)
    } catch (err) {
      setNewCustomerError(errorMessage(err, 'Could not create the customer. Please try again.'))
    } finally {
      setIsCreatingCustomer(false)
    }
  }

  function addProductLine(event: ChangeEvent<HTMLSelectElement>) {
    const product = products.find((item) => item.id === event.target.value)
    if (!product) return
    if (lines.some((line) => line.productId === product.id)) {
      setShowDuplicateWarning(true)
      return
    }
    setShowDuplicateWarning(false)
    updateLines((prev) => [...prev, { productId: product.id, name: product.name, sku: product.sku, unit: product.unitOfMeasure, qty: '1' }])
  }

  function updateLineQty(productId: string, qty: string) {
    updateLines((prev) => prev.map((line) => (line.productId === productId ? { ...line, qty } : line)))
  }

  function removeLineRow(productId: string) {
    updateLines((prev) => prev.filter((line) => line.productId !== productId))
    setShowDuplicateWarning(false)
  }

  const catalogEmpty = productsState === 'ready' && products.length === 0 && !productSearch.trim()
  const productPlaceholder =
    productsState === 'loading' && products.length === 0
      ? 'Loading products...'
      : productsState === 'error'
        ? 'Could not load products'
        : products.length === 0
          ? productSearch.trim()
            ? 'No matching products'
            : 'No active products yet'
          : '+ Add Product Line'
  const reference = delivery?.reference ?? null
  const isDraft = !delivery || delivery.status === 'DRAFT'
  const saveLabel = delivery ? (busyAction === 'save' ? 'Saving...' : delivery.status === 'WAITING' ? 'Save Changes' : 'Save Draft') : busyAction === 'save' ? 'Saving...' : 'Save as Draft'
  const confirmLabel = busyAction === 'confirm' ? 'Confirming...' : 'Confirm Delivery'

  return (
    <div className="flex-col space-y-6 pt-6 flex" id="viewDeliveryNew">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h2 className="font-headline-md text-headline-md text-slate-900 tracking-tight">{reference ? `Edit ${reference}` : 'New Delivery Order'}</h2>
          <p className="text-xs text-slate-500">Record and verify outgoing inventory for customer fulfillment. No billing or taxes involved.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors disabled:opacity-60" disabled={isBusy} onClick={leave}>
            {delivery ? 'Discard Changes' : 'Discard Draft'}
          </button>
          {isDraft && (
            <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60" disabled={isBusy} onClick={handleConfirm}>
              <span className="material-symbols-outlined text-[16px]">task_alt</span>
              <span>{confirmLabel}</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {actionError}
          </span>
          <button className="p-0.5 rounded text-rose-500 hover:text-rose-700" onClick={() => setActionError(null)}>
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Duplicate Product Warning Banner */}
      {showDuplicateWarning && (
        <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-amber-600 text-[18px] flex-shrink-0 mt-0.5">warning</span>
          <div className="flex-1 text-xs">
            <strong className="font-semibold text-amber-950">Duplicate item noticed:</strong> This product is already on the delivery. Update the existing line quantity instead of adding it twice.
          </div>
          <button className="text-amber-800 hover:text-amber-950 text-xs font-semibold" onClick={() => setShowDuplicateWarning(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Product Lines */}
        <div className="lg:col-span-8 space-y-6">
          {/* Delivery Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-[18px]">local_shipping</span>
                <h3 className="font-headline-sm text-headline-sm text-slate-900">Delivery Information</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-label-sm uppercase">Reference:</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] font-bold text-slate-700">{reference ?? 'Assigned on save'}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700" htmlFor="inputNewCustomer">
                    Customer <span className="text-rose-500">*</span>
                  </label>
                  {!showNewCustomer && customersState === 'ready' && (
                    <button className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1" onClick={() => setShowNewCustomer(true)} type="button">
                      <span className="material-symbols-outlined text-[13px]">add</span> New Customer
                    </button>
                  )}
                </div>
                <div className="relative">
                  <select className={`${SELECT_CLASS} pl-9`} disabled={customerOptions.length === 0} id="inputNewCustomer" onChange={(e) => updateForm({ customerId: e.target.value })} value={form.customerId}>
                    <option disabled value="">
                      {customersState === 'loading' ? 'Loading customers...' : customerOptions.length === 0 ? 'No customers yet' : 'Select customer...'}
                    </option>
                    {customerOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-2.5 text-slate-400 text-[17px]">business</span>
                </div>
                {customersState === 'error' && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">error</span> Could not load customers.
                    <button className="font-semibold underline hover:text-rose-700" onClick={() => setListsReload((key) => key + 1)} type="button">
                      Retry
                    </button>
                  </p>
                )}
                {customersState === 'ready' && customers.length === 0 && <p className="text-[11px] text-slate-500 mt-1">No customers exist yet. Create one below to record who receives the goods.</p>}
                {showNewCustomer && (
                  <div className="mt-2 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1" htmlFor="newCustomerName">
                          Customer name
                        </label>
                        <input
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          id="newCustomerName"
                          maxLength={200}
                          onChange={(e) => {
                            setNewCustomerName(e.target.value)
                            setNewCustomerError(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              void handleCreateCustomer()
                            }
                          }}
                          placeholder="Enter customer name"
                          type="text"
                          value={newCustomerName}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1" htmlFor="newCustomerCode">
                          Code <span className="font-normal text-slate-400">(optional)</span>
                        </label>
                        <input
                          className="w-full px-3 py-1.5 text-xs font-mono uppercase bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          id="newCustomerCode"
                          maxLength={50}
                          onChange={(e) => {
                            setNewCustomerCode(e.target.value)
                            setNewCustomerError(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              void handleCreateCustomer()
                            }
                          }}
                          placeholder="Code"
                          type="text"
                          value={newCustomerCode}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {customers.length > 0 && (
                        <button
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold"
                          onClick={() => {
                            setShowNewCustomer(false)
                            setNewCustomerName('')
                            setNewCustomerCode('')
                            setNewCustomerError(null)
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                      )}
                      <button className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold disabled:opacity-60" disabled={isCreatingCustomer} onClick={() => void handleCreateCustomer()} type="button">
                        {isCreatingCustomer ? 'Creating...' : 'Create Customer'}
                      </button>
                    </div>
                    {newCustomerError && (
                      <p className="text-[11px] text-rose-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">error</span> {newCustomerError}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* Warehouse */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="selectNewWarehouse">
                  Warehouse <span className="text-rose-500">*</span>
                </label>
                <select className={SELECT_CLASS} disabled={warehouseOptions.length === 0} id="selectNewWarehouse" onChange={(e) => updateForm({ warehouseId: e.target.value, sourceLocationId: '' })} value={form.warehouseId}>
                  <option disabled value="">
                    {warehousesState === 'loading' ? 'Loading warehouses...' : warehouseOptions.length === 0 ? 'No warehouses yet' : 'Select warehouse...'}
                  </option>
                  {warehouseOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {warehousesState === 'error' && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">error</span> Could not load warehouses.
                    <button className="font-semibold underline hover:text-rose-700" onClick={() => setListsReload((key) => key + 1)} type="button">
                      Retry
                    </button>
                  </p>
                )}
                {warehousesState === 'ready' && warehouses.length === 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    No active warehouses yet.{' '}
                    <button className={GUIDE_LINK} onClick={() => leaveTo(ROUTES.warehouse)} type="button">
                      Create one on the Warehouse page
                    </button>{' '}
                    first.
                  </p>
                )}
              </div>
              {/* Source Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="selectNewSourceLoc">
                  Source Location <span className="text-rose-500">*</span>
                </label>
                <select className={SELECT_CLASS} disabled={!form.warehouseId || locationOptions.length === 0} id="selectNewSourceLoc" onChange={(e) => updateForm({ sourceLocationId: e.target.value })} value={form.sourceLocationId}>
                  <option disabled value="">
                    {!form.warehouseId ? 'Select a warehouse first' : locationsState === 'loading' ? 'Loading locations...' : locationOptions.length === 0 ? 'No active locations' : 'Select location...'}
                  </option>
                  {locationOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {form.warehouseId && locationsState === 'error' && (
                  <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">error</span> Could not load locations.
                    <button className="font-semibold underline hover:text-rose-700" onClick={() => setListsReload((key) => key + 1)} type="button">
                      Retry
                    </button>
                  </p>
                )}
                {form.warehouseId && locationsState === 'ready' && locations.length === 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    This warehouse has no active locations.{' '}
                    <button className={GUIDE_LINK} onClick={() => leaveTo(ROUTES.warehouse)} type="button">
                      Add one on the Warehouse page
                    </button>
                    .
                  </p>
                )}
              </div>
              {/* Delivery Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="inputDeliveryDate">
                  Delivery Date <span className="text-rose-500">*</span>
                </label>
                <input className="w-full py-2 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:border-indigo-500" id="inputDeliveryDate" onChange={(e) => updateForm({ deliveryDate: e.target.value })} required type="date" value={form.deliveryDate} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Operation Type</label>
                <div className="py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-slate-600 flex items-center justify-between">
                  <span>Outbound Customer Order</span>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase">OUT</span>
                </div>
              </div>
            </div>
          </div>
          {/* Product Line Items Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-[18px]">inventory</span>
                <h3 className="font-headline-sm text-headline-sm text-slate-900">Line Items &amp; Stock Availability</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-2 top-1.5 text-slate-400 text-[16px]">search</span>
                  <input
                    aria-label="Search products"
                    className="w-32 pl-7 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search..."
                    type="search"
                    value={productSearch}
                  />
                </div>
                {/* Always resets to the placeholder option */}
                <select
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer max-w-[220px] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={products.length === 0}
                  id="deliveryProductQuickSelect"
                  onChange={addProductLine}
                  value=""
                >
                  <option value="">{productPlaceholder}</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {`${product.name} (${product.sku})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {productsState === 'error' && (
              <p className="text-[11px] text-rose-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">error</span> Could not load the product catalog.
                <button className="font-semibold underline hover:text-rose-700" onClick={() => setListsReload((key) => key + 1)} type="button">
                  Retry
                </button>
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[11px] font-label-sm uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                    <th className="py-2 font-semibold">Product Description</th>
                    <th className="py-2 font-semibold">SKU</th>
                    <th className="py-2 font-semibold text-right">Available Stock</th>
                    <th className="py-2 font-semibold text-center w-20">Unit</th>
                    <th className="py-2 font-semibold text-right w-28">Order Qty</th>
                    <th className="py-2 text-right w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-body-sm" id="newLinesTableBody">
                  {lines.length === 0 && (
                    <tr>
                      <td className="py-8 text-center text-slate-400" colSpan={6}>
                        {catalogEmpty ? (
                          <>
                            No active products in the catalog yet.{' '}
                            <button className={GUIDE_LINK} onClick={() => leaveTo(ROUTES.productNew)} type="button">
                              Create a product
                            </button>{' '}
                            first, then add it here.
                          </>
                        ) : (
                          'No products added yet. Use "+ Add Product Line" to add one.'
                        )}
                      </td>
                    </tr>
                  )}
                  {lines.map((line) => {
                    const available = lineStock(line)
                    const qty = parseQty(line.qty)
                    const isOver = typeof available === 'number' && qty !== null && qty > available
                    const isInvalid = qty === null
                    return (
                      <Fragment key={line.productId}>
                        <tr className="align-middle">
                          <td className="py-3 pr-2">
                            <div className="font-semibold text-slate-900">{line.name}</div>
                          </td>
                          <td className="py-3 font-mono font-medium text-slate-600">{line.sku}</td>
                          <td className="py-3 text-right">
                            {available === null ? (
                              <span className="text-[11px] text-slate-400">Pick a location</span>
                            ) : available === 'loading' ? (
                              <span className="text-[11px] text-slate-400">Checking...</span>
                            ) : available === 'error' ? (
                              <span className="text-[11px] text-rose-500">Unavailable</span>
                            ) : (
                              <span
                                className={
                                  isOver
                                    ? 'inline-flex items-center gap-1 font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60'
                                    : 'inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60'
                                }
                              >
                                <span className="material-symbols-outlined text-[12px]">{isOver ? 'warning' : 'check_circle'}</span>
                                {`${formatQty(available)} ${line.unit} avail`}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-center text-slate-500 font-mono">{line.unit}</td>
                          <td className="py-3 text-right">
                            <input
                              aria-label={`Quantity of ${line.sku}`}
                              className={isOver || isInvalid ? `${QTY_INPUT} ${QTY_INPUT_OVER}` : QTY_INPUT}
                              min="0"
                              onChange={(e) => updateLineQty(line.productId, e.target.value)}
                              step="any"
                              type="number"
                              value={line.qty}
                            />
                          </td>
                          <td className="py-3 text-right">
                            <button className="text-slate-300 hover:text-rose-500 p-1 rounded transition-colors" onClick={() => removeLineRow(line.productId)} title="Remove line">
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </td>
                        </tr>
                        {/* Inline Alert Container */}
                        {isOver && (
                          <tr>
                            <td className="pb-3 pt-0" colSpan={6}>
                              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-600 text-[16px]">warning</span>
                                <span>
                                  <strong>Insufficient Stock Warning:</strong> {`Requested ${formatQty(qty)} ${line.unit} exceeds the ${formatQty(available)} ${line.unit} available at ${locationName}. You can still save; confirming will put the delivery in Waiting until stock arrives.`}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Bottom Actions inside card */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
              <span className="text-slate-400 text-[11px]">Quantities must be greater than 0. Stock is only checked and deducted at validation.</span>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition-colors disabled:opacity-60" disabled={isBusy} onClick={handleSave}>
                  {saveLabel}
                </button>
                {isDraft && (
                  <button className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs transition-colors flex items-center gap-1 disabled:opacity-60" disabled={isBusy} onClick={handleConfirm}>
                    <span className="material-symbols-outlined text-[15px]">send</span>
                    <span>{confirmLabel}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Right Column: Summary & Integrity Notice Panel */}
        <div className="lg:col-span-4 space-y-5">
          {/* Delivery Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="font-headline-sm text-headline-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Delivery Summary</span>
              <span className="font-mono text-xs text-indigo-600 font-semibold">{reference ?? 'New'}</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Total Line Items:</span>
                <span className="font-mono font-bold text-slate-900" id="summaryTotalLines">{linesLabel(lines.length)}</span>
              </div>
              <div className="flex justify-between gap-3 py-1 border-b border-slate-50">
                <span className="text-slate-500">Warehouse:</span>
                <span className="font-medium text-slate-800 text-right">{selectedWarehouse ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-3 py-1 border-b border-slate-50">
                <span className="text-slate-500">Source Location:</span>
                <span className="font-medium text-slate-800 text-right">{selectedLocation ?? '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Stock Check:</span>
                <span className={overLines.length > 0 ? 'font-mono text-rose-600 font-semibold' : 'font-mono text-emerald-700 font-semibold'}>
                  {!form.sourceLocationId || lines.length === 0 ? '—' : overLines.length > 0 ? `${linesLabel(overLines.length)} short` : 'All in stock'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Stock Decrement:</span>
                <span className="font-mono font-bold text-indigo-700">{lines.length > 0 ? `-${formatQty(totalQty)} ${totalUnit} total` : '—'}</span>
              </div>
            </div>
          </div>
          {/* Inventory Integrity Guarantee Card */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-950 text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-900 font-bold">
              <span className="material-symbols-outlined text-indigo-600 text-[18px]">verified_user</span>
              <span>Stock Ledger Integrity Protocol</span>
            </div>
            <p className="leading-relaxed text-[11px] text-indigo-900/80">
              Stock is <strong>NOT deducted</strong> when a delivery is saved or confirmed. Available stock is informational until the delivery is picked, packed and validated.
            </p>
            <div className="pt-1 border-t border-indigo-200/50 flex items-center justify-between text-[10px] text-indigo-700 font-mono">
              <span>Ledger: Atomic Deduct</span>
              <span>Zero Double Counts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
