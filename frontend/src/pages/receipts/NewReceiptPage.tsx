import { Fragment, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client.ts'
import { listProducts } from '../../api/products.ts'
import { cancelReceipt, confirmReceipt, createReceipt, createSupplier, getReceipt, listSuppliers, markReceiptReady, updateReceipt, validateReceipt } from '../../api/receipts.ts'
import { DOCUMENT_STATUS_LABEL, type DocumentStatus, type Location as StockLocation, type Product, type Receipt, type ReceiptStockChange, type Supplier, type Warehouse } from '../../api/types.ts'
import { listLocations, listWarehouses } from '../../api/warehouses.ts'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { productDetailPath, receiptPath, ROUTES } from '../../routes.ts'
import { ProductSkeleton } from '../products/detail/ProductSkeleton.tsx'
import { errorMessage, formatDate, formatQty, isUuid, useDebouncedValue } from '../products/productsData.ts'
import { emptyForm, formFromReceipt, formKey, isEditableStatus, parseQty, plural, toReceiptInput, withCurrent, type ReceiptForm, type ReceiptLine, type SelectOption } from './new/data.ts'
import { ReceiptLinesCard } from './new/ReceiptLinesCard.tsx'
import { ReceiptNotFound } from './new/ReceiptNotFound.tsx'
import { ReceiptSummaryCard, type ReceiptPrimaryAction } from './new/ReceiptSummaryCard.tsx'
import { ReceiptValidationModal } from './new/ReceiptValidationModal.tsx'

const STEP_ACTIVE = 'px-2.5 py-0.5 rounded-full font-semibold bg-indigo-600 text-white flex items-center gap-1 text-[11px]'
const STEP_INACTIVE = 'px-2 py-0.5 rounded-full text-slate-500 bg-slate-100 text-[11px]'
const SELECT_CLASS = 'appearance-none w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer font-medium disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-700'
const SUPPLIER_SELECT_CLASS = 'appearance-none w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-700'
const DATE_INPUT = 'w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium'
const DATE_READONLY = 'w-full pl-9 pr-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-not-allowed'
const SECONDARY_BTN = 'px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-60'
const SAVE_BTN = 'px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-60'
const PRIMARY_BTN = 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-70'
const GUIDE_LINK = 'font-semibold text-indigo-600 hover:text-indigo-800 underline'

const STATUS_BADGES: Record<DocumentStatus, { className: string; dot: string }> = {
  DRAFT: {
    className: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60',
    dot: 'w-1.5 h-1.5 rounded-full bg-amber-500',
  },
  WAITING: {
    className: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200/60',
    dot: 'w-1.5 h-1.5 rounded-full bg-blue-500',
  },
  READY: {
    className: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200/60',
    dot: 'w-1.5 h-1.5 rounded-full bg-indigo-500',
  },
  DONE: {
    className: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60',
    dot: 'w-1.5 h-1.5 rounded-full bg-emerald-500',
  },
  CANCELED: {
    className: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200',
    dot: 'w-1.5 h-1.5 rounded-full bg-slate-400',
  },
}

const PIPELINE_STEPS: { id: string; label: string; status: DocumentStatus; icon: string }[] = [
  { id: 'stepDraft', label: '1. Draft', status: 'DRAFT', icon: 'edit' },
  { id: 'stepWaiting', label: '2. Waiting', status: 'WAITING', icon: 'schedule' },
  { id: 'stepReady', label: '3. Ready', status: 'READY', icon: 'inventory' },
  { id: 'stepDone', label: '4. Done', status: 'DONE', icon: 'verified' },
]

type LoadState = 'loading' | 'ready' | 'notfound' | 'error'
type ListState = 'loading' | 'ready' | 'error'
type BusyAction = 'save' | 'primary' | 'cancel' | 'validate'

const warehouseLabel = (warehouse: { name: string; code: string }) => `${warehouse.name} (${warehouse.code})`
const locationLabel = (location: { name: string; code: string }) => `${location.name} (${location.code})`

/** Toast subtitle describing the stock increase of a validated receipt */
function describeStockChanges(changes: ReceiptStockChange[]) {
  const shown = changes.slice(0, 3).map((change) => `${change.sku} ${formatQty(change.before)} → ${formatQty(change.after)} ${change.unitOfMeasure}`)
  const more = changes.length - shown.length
  return `${shown.join(', ')}${more > 0 ? ` and ${more} more` : ''}.`
}

// Serves both /receipts/new (create) and /receipts/:id (view / edit / workflow)
export default function NewReceiptPage() {
  const { id } = useParams()
  // Keyed so that switching receipts (or saving a new one) starts from a fresh screen state
  return <ReceiptScreen id={id ?? null} key={id ?? 'new'} />
}

function ReceiptScreen({ id }: { id: string | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()

  // A receipt just created on /receipts/new is handed over so the page renders it without a skeleton
  const [receipt, setReceipt] = useState<Receipt | null>(() => {
    const handed = (location.state as { receipt?: Receipt } | null)?.receipt
    return handed && handed.id === id ? handed : null
  })
  const [form, setForm] = useState<ReceiptForm>(() => (receipt ? formFromReceipt(receipt) : emptyForm()))
  const [reloadKey, setReloadKey] = useState(0)
  // Outcome of the last settled request; a different key means the receipt is (re)loading
  const [settled, setSettled] = useState<{ key: number; state: Exclude<LoadState, 'loading'> } | null>(() => (receipt ? { key: 0, state: 'ready' } : null))
  const [loadError, setLoadError] = useState('')
  const loadState: LoadState = id === null ? 'ready' : !isUuid(id) ? 'notfound' : settled?.key === reloadKey ? settled.state : 'loading'

  const status: DocumentStatus = receipt?.status ?? 'DRAFT'
  const canEdit = id === null || (receipt !== null && isEditableStatus(receipt.status))

  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false)
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [stockChanges, setStockChanges] = useState<ReceiptStockChange[] | null>(null)

  // Pickers (active records only); bumping listsReload refetches all of them
  const [listsReload, setListsReload] = useState(0)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [suppliersSettled, setSuppliersSettled] = useState<{ key: number; state: 'ready' | 'error' } | null>(null)
  const suppliersState: ListState = suppliersSettled?.key === listsReload ? suppliersSettled.state : 'loading'
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehousesSettled, setWarehousesSettled] = useState<{ key: number; state: 'ready' | 'error' } | null>(null)
  const warehousesState: ListState = warehousesSettled?.key === listsReload ? warehousesSettled.state : 'loading'
  const locationsKey = `${form.warehouseId}|${listsReload}`
  const [locationsSettled, setLocationsSettled] = useState<{ key: string; warehouseId: string; state: 'ready' | 'error'; data: StockLocation[] } | null>(null)
  const locationsState: ListState = locationsSettled?.key === locationsKey ? locationsSettled.state : 'loading'
  const locations = locationsSettled?.warehouseId === form.warehouseId ? locationsSettled.data : []
  const [productSearch, setProductSearch] = useState('')
  const debouncedSearch = useDebouncedValue(productSearch.trim(), 300)
  const productsKey = `${debouncedSearch}|${listsReload}`
  const [productsSettled, setProductsSettled] = useState<{ key: string; state: 'ready' | 'error'; data: Product[] } | null>(null)
  const productsState: ListState = productsSettled?.key === productsKey ? productsSettled.state : 'loading'
  const products = productsSettled?.data ?? []

  // Inline "new supplier" form
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierCode, setNewSupplierCode] = useState('')
  const [newSupplierError, setNewSupplierError] = useState<string | null>(null)
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false)

  useDocumentTitle(`StockSense — ${receipt ? `Receipt ${receipt.reference}` : id === null ? 'New Receipt' : 'Receipt'}`)

  useEffect(() => {
    if (id === null || !isUuid(id)) return
    let cancelled = false
    getReceipt(id)
      .then((res) => {
        if (cancelled) return
        setReceipt(res)
        setForm(formFromReceipt(res))
        setSettled({ key: reloadKey, state: 'ready' })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
          setSettled({ key: reloadKey, state: 'notfound' })
        } else {
          setLoadError(errorMessage(err, 'Could not load this receipt. Please try again.'))
          setSettled({ key: reloadKey, state: 'error' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

  useEffect(() => {
    if (!canEdit) return
    let cancelled = false
    listSuppliers({ status: 'ACTIVE' })
      .then((res) => {
        if (cancelled) return
        setSuppliers([...res].sort((a, b) => a.name.localeCompare(b.name)))
        setSuppliersSettled({ key: listsReload, state: 'ready' })
        // Nothing to pick from yet: open the inline form right away
        if (res.length === 0) setShowNewSupplier(true)
      })
      .catch(() => {
        if (!cancelled) setSuppliersSettled({ key: listsReload, state: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [canEdit, listsReload])

  useEffect(() => {
    if (!canEdit) return
    let cancelled = false
    listWarehouses({ status: 'ACTIVE', limit: 100 })
      .then((res) => {
        if (cancelled) return
        setWarehouses(res.data)
        setWarehousesSettled({ key: listsReload, state: 'ready' })
        // A single warehouse is preselected on a new receipt
        if (id === null && res.data.length === 1) setForm((prev) => (prev.warehouseId ? prev : { ...prev, warehouseId: res.data[0].id, locationId: '' }))
      })
      .catch(() => {
        if (!cancelled) setWarehousesSettled({ key: listsReload, state: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [canEdit, id, listsReload])

  const warehouseId = form.warehouseId
  useEffect(() => {
    if (!canEdit || !warehouseId) return
    let cancelled = false
    const key = `${warehouseId}|${listsReload}`
    listLocations({ warehouseId, status: 'ACTIVE' })
      .then((res) => {
        if (cancelled) return
        setLocationsSettled({ key, warehouseId, state: 'ready', data: res })
        // A warehouse with a single location gets it preselected
        if (res.length === 1) setForm((prev) => (prev.warehouseId === warehouseId && !prev.locationId ? { ...prev, locationId: res[0].id } : prev))
      })
      .catch(() => {
        if (!cancelled) setLocationsSettled({ key, warehouseId, state: 'error', data: [] })
      })
    return () => {
      cancelled = true
    }
  }, [canEdit, warehouseId, listsReload])

  useEffect(() => {
    if (!canEdit) return
    let cancelled = false
    const key = `${debouncedSearch}|${listsReload}`
    listProducts({ status: 'ACTIVE', limit: 100, search: debouncedSearch || undefined })
      .then((res) => {
        if (!cancelled) setProductsSettled({ key, state: 'ready', data: res.data })
      })
      .catch(() => {
        if (!cancelled) setProductsSettled({ key, state: 'error', data: [] })
      })
    return () => {
      cancelled = true
    }
  }, [canEdit, debouncedSearch, listsReload])

  // Live summary, derived from the form on every render
  const lines = form.lines
  const productCount = lines.length
  const totalQtyValue = lines.reduce((sum, line) => sum + (parseQty(line.qty) ?? 0), 0)
  const totalQty = formatQty(totalQtyValue)
  const invalidCount = lines.filter((line) => parseQty(line.qty) === null).length
  const qtyCheck =
    productCount === 0
      ? { text: 'No Items', isValid: false }
      : invalidCount > 0
        ? { text: `${invalidCount} Invalid ${plural(invalidCount, 'Line')}`, isValid: false }
        : { text: `${productCount} ${plural(productCount, 'Item')} > 0`, isValid: true }
  const isDirty = receipt ? formKey(form) !== formKey(formFromReceipt(receipt)) : Boolean(form.supplierId) || lines.length > 0

  // Select options: active records, plus the receipt's current value if it's no longer active
  const supplierOptions = withCurrent(
    suppliers.map((supplier) => ({ id: supplier.id, label: supplier.code ? `${supplier.name} (${supplier.code})` : supplier.name })),
    receipt && form.supplierId === receipt.supplier.id ? { id: receipt.supplier.id, label: `${receipt.supplier.name}${receipt.supplier.status === 'ACTIVE' ? '' : ' (inactive)'}` } : null,
  )
  const inactiveSuffix = (state: ListState) => (canEdit && state === 'ready' ? ' (inactive)' : '')
  const warehouseOptions = withCurrent(
    warehouses.map((warehouse) => ({ id: warehouse.id, label: warehouseLabel(warehouse) })),
    receipt && form.warehouseId === receipt.warehouse.id ? { id: receipt.warehouse.id, label: `${warehouseLabel(receipt.warehouse)}${inactiveSuffix(warehousesState)}` } : null,
  )
  const locationOptions = withCurrent(
    locations.map((item) => ({ id: item.id, label: locationLabel(item) })),
    receipt && form.warehouseId === receipt.warehouse.id && form.locationId === receipt.location.id ? { id: receipt.location.id, label: `${locationLabel(receipt.location)}${inactiveSuffix(locationsState)}` } : null,
  )
  const optionLabel = (options: SelectOption[], value: string) => options.find((option) => option.id === value)?.label ?? null
  const supplierLabel = optionLabel(supplierOptions, form.supplierId)
  const selectedWarehouse = optionLabel(warehouseOptions, form.warehouseId)
  const selectedLocation = optionLabel(locationOptions, form.locationId)
  const destinationLabel = selectedWarehouse && selectedLocation ? `${selectedWarehouse} · ${selectedLocation}` : null

  function updateForm(patch: Partial<ReceiptForm>) {
    setForm((prev) => ({ ...prev, ...patch }))
    setActionError(null)
  }

  function updateLines(update: (lines: ReceiptLine[]) => ReceiptLine[]) {
    setForm((prev) => ({ ...prev, lines: update(prev.lines) }))
    setActionError(null)
  }

  function applyReceipt(next: Receipt) {
    setReceipt(next)
    setForm(formFromReceipt(next))
  }

  /** Leaving mid-edit asks before dropping unsaved changes */
  function leaveTo(path: string) {
    if (canEdit && isDirty && !window.confirm('Leave this receipt? Your unsaved changes will be lost.')) return
    navigate(path)
  }

  /** Client-side checks mirroring the backend rules; returns the first problem */
  function formProblem(): string | null {
    if (!form.supplierId) return 'Choose a supplier for this receipt.'
    if (!form.warehouseId) return 'Choose the receiving warehouse.'
    if (!form.locationId) return 'Choose the receiving location.'
    if (!form.receiptDate) return 'Enter the receipt date.'
    if (lines.length === 0) return 'Add at least one product line.'
    if (invalidCount > 0) return 'Every line needs a received quantity greater than 0 (up to 3 decimals).'
    return null
  }

  async function runAction(action: BusyAction, work: () => Promise<void>, fallback: string) {
    setBusyAction(action)
    setActionError(null)
    try {
      await work()
    } catch (err) {
      setActionError(errorMessage(err, fallback))
      if (err instanceof ApiError && err.status === 409 && id) {
        // The receipt moved on (e.g. validated elsewhere): show its current state
        getReceipt(id)
          .then(applyReceipt)
          .catch(() => undefined)
      }
      // An inactive supplier / warehouse / location / product: refresh the pickers
      if (err instanceof ApiError && (err.status === 400 || err.status === 404)) setListsReload((key) => key + 1)
    } finally {
      setBusyAction(null)
    }
  }

  /** Saves pending edits of an existing DRAFT / WAITING receipt before a workflow step; returns the saved receipt */
  async function saveIfDirty(current: Receipt) {
    if (!isDirty) return current
    const saved = await updateReceipt(current.id, toReceiptInput(form))
    applyReceipt(saved)
    return saved
  }

  function handleSave() {
    const problem = formProblem()
    if (problem) {
      setActionError(problem)
      return
    }
    void runAction(
      receipt ? 'save' : 'primary',
      async () => {
        const input = toReceiptInput(form)
        if (!receipt) {
          const created = await createReceipt(input)
          showToast('Draft saved', `${created.reference} created with ${created.lineCount} ${plural(created.lineCount, 'line')} (${formatQty(created.totalQuantity)} units).`)
          navigate(receiptPath(created.id), { replace: true, state: { receipt: created } })
          return
        }
        const updated = await updateReceipt(receipt.id, input)
        applyReceipt(updated)
        showToast('Receipt saved', `${updated.reference} saved with ${updated.lineCount} ${plural(updated.lineCount, 'line')} (${formatQty(updated.totalQuantity)} units).`)
      },
      'Could not save the receipt. Please try again.',
    )
  }

  function handleConfirm() {
    if (!receipt) return
    const problem = formProblem()
    if (problem) {
      setActionError(problem)
      return
    }
    void runAction(
      'primary',
      async () => {
        const saved = await saveIfDirty(receipt)
        const confirmed = await confirmReceipt(saved.id)
        applyReceipt(confirmed)
        showToast('Receipt confirmed', `${confirmed.reference} is now waiting for the goods to arrive.`)
      },
      'Could not confirm the receipt. Please try again.',
    )
  }

  function handleMarkReady() {
    if (!receipt) return
    const problem = formProblem()
    if (problem) {
      setActionError(problem)
      return
    }
    void runAction(
      'primary',
      async () => {
        const saved = await saveIfDirty(receipt)
        const ready = await markReceiptReady(saved.id)
        applyReceipt(ready)
        showToast('Goods arrived', `${ready.reference} is ready to be validated.`)
      },
      'Could not mark the receipt as arrived. Please try again.',
    )
  }

  function openReceiptValidationModal() {
    setActionError(null)
    setIsValidationModalOpen(true)
  }

  async function executeReceiptValidation() {
    if (!receipt) return
    await runAction(
      'validate',
      async () => {
        const { stockChanges: changes, ...validated } = await validateReceipt(receipt.id)
        applyReceipt(validated)
        setStockChanges(changes)
        setShowDuplicateWarning(false)
        showToast('Receipt validated', describeStockChanges(changes))
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      'Could not validate the receipt. Please try again.',
    )
    setIsValidationModalOpen(false)
  }

  function handleCancel() {
    if (!receipt) {
      if (isDirty && !window.confirm('Discard this new receipt? The details you entered will be lost.')) return
      navigate(ROUTES.receipts)
      return
    }
    if (status === 'DONE' || status === 'CANCELED') {
      navigate(ROUTES.receipts)
      return
    }
    if (!window.confirm(`Cancel receipt ${receipt.reference}? This can't be undone and stock balances stay unchanged.`)) return
    void runAction(
      'cancel',
      async () => {
        const canceled = await cancelReceipt(receipt.id)
        showToast('Receipt canceled', `${canceled.reference} was canceled. Stock balances are unchanged.`)
        navigate(ROUTES.receipts)
      },
      'Could not cancel the receipt. Please try again.',
    )
  }

  async function handleCreateSupplier() {
    const name = newSupplierName.trim()
    const code = newSupplierCode.trim()
    if (!name) {
      setNewSupplierError('Supplier name is required.')
      return
    }
    setIsCreatingSupplier(true)
    setNewSupplierError(null)
    try {
      const created = await createSupplier({ name, ...(code ? { code } : {}) })
      setSuppliers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      updateForm({ supplierId: created.id })
      setNewSupplierName('')
      setNewSupplierCode('')
      setShowNewSupplier(false)
      showToast('Supplier created', `${created.name} is ready to use.`)
    } catch (err) {
      setNewSupplierError(errorMessage(err, 'Could not create the supplier. Please try again.'))
    } finally {
      setIsCreatingSupplier(false)
    }
  }

  function addSelectedProductFromCatalog(productId: string) {
    const product = products.find((item) => item.id === productId)
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

  function removeReceiptLine(productId: string) {
    updateLines((prev) => prev.filter((line) => line.productId !== productId))
  }

  if (loadState === 'loading') {
    return (
      <main className="w-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-7 transition-all duration-150" id="view-receipt-new">
        <ProductSkeleton />
      </main>
    )
  }

  if (loadState === 'notfound' || (loadState === 'ready' && id !== null && !receipt)) {
    return (
      <main className="w-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-7 transition-all duration-150" id="view-receipt-new">
        <ReceiptNotFound />
      </main>
    )
  }

  if (loadState === 'error') {
    return (
      <main className="w-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-7 transition-all duration-150" id="view-receipt-new">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-12 text-center max-w-lg mx-auto my-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2 border border-rose-100">
            <span className="material-symbols-outlined text-3xl">cloud_off</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Couldn&apos;t load this receipt</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">{loadError}</p>
          <div className="pt-3 flex items-center justify-center gap-2.5">
            <button className={SECONDARY_BTN} onClick={() => navigate(ROUTES.receipts)}>
              <span className="material-symbols-outlined text-[16px] text-slate-500">arrow_back</span>
              <span>Back to Receipts</span>
            </button>
            <button className={PRIMARY_BTN} onClick={() => setReloadKey((key) => key + 1)}>
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Retry</span>
            </button>
          </div>
        </div>
      </main>
    )
  }

  const isBusy = busyAction !== null
  const isClosed = status === 'DONE' || status === 'CANCELED'
  const badge = STATUS_BADGES[status]
  const reference = receipt?.reference ?? null

  // Status-driven actions
  const primaryAction: ReceiptPrimaryAction | null = !receipt
    ? { label: 'Save Draft', busyLabel: 'Saving...', icon: 'bookmark', onClick: handleSave }
    : status === 'DRAFT'
      ? { label: 'Confirm Receipt', busyLabel: 'Confirming...', icon: 'task_alt', onClick: handleConfirm }
      : status === 'WAITING'
        ? { label: 'Mark as Arrived', busyLabel: 'Updating...', icon: 'local_shipping', onClick: handleMarkReady }
        : status === 'READY'
          ? { label: 'Validate Receipt', busyLabel: 'Validating...', icon: 'check', onClick: openReceiptValidationModal }
          : null
  const saveLabel = receipt && status === 'DRAFT' ? 'Save Draft' : receipt && status === 'WAITING' ? 'Save' : null
  const cancelLabel = !receipt ? 'Cancel' : isClosed ? 'Back to Receipts' : 'Cancel Receipt'
  const summaryHint = !receipt
    ? 'Saving creates a draft and assigns its reference.'
    : status === 'DRAFT'
      ? 'Confirming saves your changes and moves the receipt to Waiting.'
      : status === 'WAITING'
        ? 'Mark as arrived once the goods are at the dock. The receipt then locks for validation.'
        : status === 'READY'
          ? 'Immutable commit: updates product balances & ledger timestamps instantly.'
          : status === 'DONE'
            ? 'This receipt is validated and can no longer change.'
            : 'This receipt was canceled. Stock balances were not changed.'

  return (
    <>
      <main className="w-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-7 transition-all duration-150" id="view-receipt-new">
        {/* Breadcrumb & Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <button className="hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors" onClick={() => leaveTo(ROUTES.receipts)}>
                <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                <span>Receipts</span>
              </button>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800">{reference ?? 'New Receipt'}</span>
              {!receipt && <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-indigo-50 text-indigo-700 font-medium ml-1">/receipts/new</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{receipt ? 'Receipt' : 'New Receipt'}</h1>
              <div className="flex items-center gap-1.5 text-xs font-semibold" id="receiptStatusBadgeContainer">
                <span className={badge.className} id="receiptStatusBadge">
                  <span className={badge.dot} />
                  {DOCUMENT_STATUS_LABEL[status]}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200" id="displayReceiptRefHeader">
                {reference ?? 'Assigned on save'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Record incoming stock from a vendor into warehouse inventory nodes.</p>
          </div>
          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button className={SECONDARY_BTN} disabled={isBusy} id="btnReceiptCancel" onClick={handleCancel}>
              <span className="material-symbols-outlined text-[16px] text-slate-500">{isClosed ? 'arrow_back' : 'close'}</span>
              <span>{busyAction === 'cancel' ? 'Canceling...' : cancelLabel}</span>
            </button>
            {saveLabel && (
              <button className={SAVE_BTN} disabled={isBusy} id="btnReceiptSaveDraft" onClick={handleSave}>
                <span className={busyAction === 'save' ? 'material-symbols-outlined text-[16px] text-slate-500 animate-spin' : 'material-symbols-outlined text-[16px] text-slate-500'}>{busyAction === 'save' ? 'progress_activity' : 'bookmark'}</span>
                <span>{busyAction === 'save' ? 'Saving...' : saveLabel}</span>
              </button>
            )}
            {primaryAction && (
              <button className={PRIMARY_BTN} disabled={isBusy} id="btnReceiptValidateHeader" onClick={primaryAction.onClick}>
                <span className={busyAction === 'primary' ? 'material-symbols-outlined text-[16px] animate-spin' : 'material-symbols-outlined text-[16px]'}>{busyAction === 'primary' ? 'progress_activity' : primaryAction.icon}</span>
                <span>{busyAction === 'primary' ? primaryAction.busyLabel : primaryAction.label}</span>
              </button>
            )}
          </div>
        </div>

        {/* Server / validation errors of the last action */}
        {actionError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3" id="receiptActionError">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {actionError}
            </span>
            <button className="p-0.5 rounded text-rose-500 hover:text-rose-700" onClick={() => setActionError(null)}>
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Workflow Step Indicator Ribbon */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Workflow Pipeline:</span>
            <div className="flex flex-wrap items-center gap-2" id="workflowPipelineSteps">
              {PIPELINE_STEPS.map((step, index) => {
                const isActive = step.status === status
                return (
                  <Fragment key={step.id}>
                    {index > 0 && <span className="text-slate-300">→</span>}
                    <span className={isActive ? STEP_ACTIVE : STEP_INACTIVE} id={step.id}>
                      {isActive && <span className="material-symbols-outlined text-[13px]">{step.icon}</span>}
                      {isActive ? ` ${step.label}` : step.label}
                    </span>
                  </Fragment>
                )
              })}
              <span className="text-slate-300">·</span>
              <span className={status === 'CANCELED' ? 'px-2.5 py-0.5 rounded-full font-semibold bg-slate-600 text-white flex items-center gap-1 text-[11px]' : 'px-2 py-0.5 rounded-full text-slate-400 text-[11px]'} id="stepCanceled">
                {status === 'CANCELED' && <span className="material-symbols-outlined text-[13px]">block</span>}
                Canceled
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>System Auto-Balance Guard Active</span>
          </div>
        </div>

        {/* Success Banner for Validated State */}
        {receipt && status === 'DONE' && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-900 flex items-start justify-between gap-3" id="receiptValidatedBanner">
            <div>
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                Receipt Validated &amp; Stock Ledger Updated
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                +{formatQty(receipt.totalQuantity)} total units have been immutably credited to{' '}
                <strong>
                  {receipt.warehouse.name} · {receipt.location.name}
                </strong>
                . Transaction reference: <strong>{receipt.reference}</strong>.
                {receipt.validatedBy && receipt.validatedAt && ` Validated by ${receipt.validatedBy.fullName} on ${formatDate(receipt.validatedAt)}.`}
              </p>
              <ul className="mt-2 space-y-0.5 text-[11px] text-emerald-800">
                {receipt.items.map((item) => {
                  const change = stockChanges?.find((entry) => entry.productId === item.productId)
                  return (
                    <li className="flex flex-wrap items-center gap-1.5" key={item.id}>
                      <button className="font-mono font-semibold underline hover:text-emerald-950" onClick={() => navigate(productDetailPath(item.productId))}>
                        {item.sku}
                      </button>
                      <span>{`+${formatQty(item.quantity)} ${item.unitOfMeasure}`}</span>
                      {change && <span className="font-mono text-emerald-700">{`(${formatQty(change.before)} → ${formatQty(change.after)} ${change.unitOfMeasure})`}</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
            {receipt.items.length === 1 && (
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold shadow-xs transition-colors" onClick={() => navigate(productDetailPath(receipt.items[0].productId))}>
                  View Stock in {receipt.items[0].sku}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Canceled notice */}
        {receipt && status === 'CANCELED' && (
          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-start gap-2.5 text-xs">
            <span className="material-symbols-outlined text-slate-500 text-[18px] flex-shrink-0">block</span>
            <span>
              <strong className="font-semibold text-slate-900">This receipt was canceled.</strong> It is kept for reference only; stock balances were not changed.
            </span>
          </div>
        )}

        {/* Duplicate Product Warning Banner */}
        {canEdit && showDuplicateWarning && (
          <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-start gap-2.5" id="receiptDuplicateBanner">
            <span className="material-symbols-outlined text-amber-600 text-[18px] flex-shrink-0 mt-0.5">warning</span>
            <div className="flex-1 text-xs">
              <strong className="font-semibold text-amber-950">Duplicate item noticed:</strong> This product has already been added to the receipt. Update the existing line quantity instead of creating a duplicate row.
            </div>
            <button className="text-amber-800 hover:text-amber-950 text-xs font-semibold" onClick={() => setShowDuplicateWarning(false)}>
              Dismiss
            </button>
          </div>
        )}

        {/* 2-COLUMN MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (7 Cols): Receipt Information & Product Line Items */}
          <div className="lg:col-span-7 space-y-6">
            {/* CARD A: Receipt Information */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">assignment</span>
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Receipt Information</h2>
                    <p className="text-[11px] text-slate-400">Header parameters, partner identification, and target warehouse node.</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">{canEdit ? 'Incoming Dispatch' : 'Read-Only'}</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Supplier Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700" htmlFor="rcptSupplierInput">
                        Supplier <span className="text-rose-500">*</span>
                      </label>
                      {canEdit && !showNewSupplier && suppliersState === 'ready' && (
                        <button className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1" onClick={() => setShowNewSupplier(true)} type="button">
                          <span className="material-symbols-outlined text-[13px]">add</span> New Supplier
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined pointer-events-none absolute left-3 top-2.5 text-slate-400 text-[16px]">corporate_fare</span>
                      <select className={SUPPLIER_SELECT_CLASS} disabled={!canEdit || supplierOptions.length === 0} id="rcptSupplierInput" onChange={(e) => updateForm({ supplierId: e.target.value })} value={form.supplierId}>
                        <option disabled value="">
                          {canEdit && suppliersState === 'loading' ? 'Loading suppliers...' : supplierOptions.length === 0 ? 'No suppliers yet' : 'Select supplier...'}
                        </option>
                        {supplierOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400 text-base">unfold_more</span>
                    </div>
                    {canEdit && suppliersState === 'error' && (
                      <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">error</span> Could not load suppliers.
                        <button className="font-semibold underline hover:text-rose-700" onClick={() => setListsReload((key) => key + 1)} type="button">
                          Retry
                        </button>
                      </p>
                    )}
                    {canEdit && suppliersState === 'ready' && suppliers.length === 0 && <p className="text-[11px] text-slate-500 mt-1">No suppliers exist yet. Create one below to record who delivered the goods.</p>}
                    {canEdit && showNewSupplier && (
                      <div className="mt-2 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1" htmlFor="newSupplierName">
                              Supplier name
                            </label>
                            <input
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              id="newSupplierName"
                              maxLength={200}
                              onChange={(e) => {
                                setNewSupplierName(e.target.value)
                                setNewSupplierError(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  void handleCreateSupplier()
                                }
                              }}
                              placeholder="Enter supplier name"
                              type="text"
                              value={newSupplierName}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1" htmlFor="newSupplierCode">
                              Code <span className="font-normal text-slate-400">(optional)</span>
                            </label>
                            <input
                              className="w-full px-3 py-1.5 text-xs font-mono uppercase bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              id="newSupplierCode"
                              maxLength={50}
                              onChange={(e) => {
                                setNewSupplierCode(e.target.value)
                                setNewSupplierError(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  void handleCreateSupplier()
                                }
                              }}
                              placeholder="Code"
                              type="text"
                              value={newSupplierCode}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          {suppliers.length > 0 && (
                            <button
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-semibold"
                              onClick={() => {
                                setShowNewSupplier(false)
                                setNewSupplierName('')
                                setNewSupplierCode('')
                                setNewSupplierError(null)
                              }}
                              type="button"
                            >
                              Cancel
                            </button>
                          )}
                          <button className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold disabled:opacity-60" disabled={isCreatingSupplier} onClick={() => void handleCreateSupplier()} type="button">
                            {isCreatingSupplier ? 'Creating...' : 'Create Supplier'}
                          </button>
                        </div>
                        {newSupplierError && (
                          <p className="text-[11px] text-rose-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">error</span> {newSupplierError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Receipt Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="rcptDateInput">
                      Receipt Date <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined pointer-events-none absolute left-3 top-2.5 text-slate-400 text-[16px]">calendar_today</span>
                      <input className={canEdit ? DATE_INPUT : DATE_READONLY} id="rcptDateInput" onChange={(e) => updateForm({ receiptDate: e.target.value })} readOnly={!canEdit} required type="date" value={form.receiptDate} />
                    </div>
                  </div>
                  {/* Receiving Warehouse */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="rcptWarehouseSelect">
                      Receiving Warehouse <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        className={SELECT_CLASS}
                        disabled={!canEdit || warehouseOptions.length === 0}
                        id="rcptWarehouseSelect"
                        onChange={(e) => updateForm({ warehouseId: e.target.value, locationId: '' })}
                        value={form.warehouseId}
                      >
                        <option disabled value="">
                          {canEdit && warehousesState === 'loading' ? 'Loading warehouses...' : warehouseOptions.length === 0 ? 'No warehouses yet' : 'Select warehouse...'}
                        </option>
                        {warehouseOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400 text-base">unfold_more</span>
                    </div>
                    {canEdit && warehousesState === 'error' && (
                      <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">error</span> Could not load warehouses.
                        <button className="font-semibold underline hover:text-rose-700" onClick={() => setListsReload((key) => key + 1)} type="button">
                          Retry
                        </button>
                      </p>
                    )}
                    {canEdit && warehousesState === 'ready' && warehouses.length === 0 && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        No active warehouses yet.{' '}
                        <button className={GUIDE_LINK} onClick={() => leaveTo(ROUTES.warehouse)} type="button">
                          Create one on the Warehouse page
                        </button>{' '}
                        first.
                      </p>
                    )}
                  </div>
                  {/* Receiving Location */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="rcptLocationSelect">
                      Receiving Location <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select className={SELECT_CLASS} disabled={!canEdit || !form.warehouseId || locationOptions.length === 0} id="rcptLocationSelect" onChange={(e) => updateForm({ locationId: e.target.value })} value={form.locationId}>
                        <option disabled value="">
                          {!form.warehouseId ? 'Select a warehouse first' : canEdit && locationsState === 'loading' ? 'Loading locations...' : locationOptions.length === 0 ? 'No active locations' : 'Select location...'}
                        </option>
                        {locationOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400 text-base">unfold_more</span>
                    </div>
                    {canEdit && form.warehouseId && locationsState === 'error' && (
                      <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">error</span> Could not load locations.
                        <button className="font-semibold underline hover:text-rose-700" onClick={() => setListsReload((key) => key + 1)} type="button">
                          Retry
                        </button>
                      </p>
                    )}
                    {canEdit && form.warehouseId && locationsState === 'ready' && locations.length === 0 && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        This warehouse has no active locations.{' '}
                        <button className={GUIDE_LINK} onClick={() => leaveTo(ROUTES.warehouse)} type="button">
                          Add one on the Warehouse page
                        </button>
                        .
                      </p>
                    )}
                  </div>
                </div>
                {/* Auto-generated reference preview banner */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Reference:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{reference ?? 'Assigned on save'}</span>
                    <span className="text-[10px] text-slate-400">(Auto-generated sequential ledger key)</span>
                  </div>
                  {receipt && <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{`Created by ${receipt.createdBy.fullName} on ${formatDate(receipt.createdAt)}`}</span>}
                </div>
              </div>
            </div>

            {/* CARD B: Products Line Items Section */}
            <ReceiptLinesCard
              isLocked={!canEdit}
              lines={lines}
              onCreateProduct={() => leaveTo(ROUTES.productNew)}
              onProductSearchChange={setProductSearch}
              onQtyChange={updateLineQty}
              onQuickAdd={addSelectedProductFromCatalog}
              onRemove={removeReceiptLine}
              onRetryProducts={() => setListsReload((key) => key + 1)}
              productSearch={productSearch}
              products={products}
              productsState={productsState}
            />
          </div>

          {/* RIGHT COLUMN (5 Cols): Receipt Summary, Real-Time Calculations, and Ledger Impact */}
          <ReceiptSummaryCard
            destinationLabel={destinationLabel}
            hint={summaryHint}
            isBusy={isBusy}
            isPrimaryBusy={busyAction === 'primary'}
            primaryAction={primaryAction}
            productCount={productCount}
            qtyCheck={qtyCheck}
            status={status}
            supplierLabel={supplierLabel}
            totalQty={totalQty}
          />
        </div>
      </main>

      {isValidationModalOpen && receipt && (
        <ReceiptValidationModal
          destinationLabel={`${receipt.warehouse.name} · ${receipt.location.name}`}
          ingestSummary={`${receipt.lineCount} ${plural(receipt.lineCount, 'SKU')} (${formatQty(receipt.totalQuantity)} ${plural(Number(receipt.totalQuantity), 'Unit')})`}
          isSubmitting={busyAction === 'validate'}
          onCancel={() => setIsValidationModalOpen(false)}
          onConfirm={() => void executeReceiptValidation()}
          reference={receipt.reference}
        />
      )}
    </>
  )
}
