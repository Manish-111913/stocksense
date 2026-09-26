import { Fragment, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import { useToast } from '../../context/toast.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { productDetailPath, ROUTES } from '../../routes.ts'
import { CATALOG, catalogOptionValue, INITIAL_LINES, parseQty, plural, RECEIPT_REF, SUPPLIERS, WAREHOUSES, type ReceiptLine, type ReceiptWorkflowState } from './new/data.ts'
import { ReceiptLinesCard } from './new/ReceiptLinesCard.tsx'
import { ReceiptSummaryCard } from './new/ReceiptSummaryCard.tsx'
import { ReceiptValidationModal } from './new/ReceiptValidationModal.tsx'

// The Draft scenario button / Draft step pill carry the active classes by default
const SCENARIO_ACTIVE = 'px-2.5 py-1 rounded-md font-semibold bg-indigo-600 text-white shadow-xs flex items-center gap-1 transition-all'
const SCENARIO_INACTIVE = 'px-2.5 py-1 rounded-md font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1'
const STEP_ACTIVE = 'px-2.5 py-0.5 rounded-full font-semibold bg-indigo-600 text-white flex items-center gap-1 text-[11px]'
const STEP_INACTIVE = 'px-2 py-0.5 rounded-full text-slate-500 bg-slate-100 text-[11px]'
const SELECT_CLASS = 'appearance-none w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer font-medium'

const STATUS_BADGES: Record<ReceiptWorkflowState, { className: string; dot: string; label: string }> = {
  draft: {
    className: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60',
    dot: 'w-1.5 h-1.5 rounded-full bg-amber-500',
    label: 'Draft',
  },
  done: {
    className: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60',
    dot: 'w-1.5 h-1.5 rounded-full bg-emerald-500',
    label: 'Done',
  },
}

const PIPELINE_STEPS: { id: string; label: string; activeIn?: ReceiptWorkflowState; icon?: string }[] = [
  { id: 'stepDraft', label: '1. Draft', activeIn: 'draft', icon: 'edit' },
  { id: 'stepWaiting', label: '2. Waiting' },
  { id: 'stepReady', label: '3. Ready' },
  { id: 'stepDone', label: '4. Done', activeIn: 'done', icon: 'verified' },
]

const formatQty = (value: number) => Math.round(value * 1000) / 1000

export default function NewReceiptPage() {
  useDocumentTitle('StockSense — New Receipt')
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [workflowState, setWorkflowState] = useState<ReceiptWorkflowState>('draft')
  const [lines, setLines] = useState<ReceiptLine[]>(INITIAL_LINES)
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false)
  const [warehouseValue, setWarehouseValue] = useState(WAREHOUSES[0].value)
  const [locationValue, setLocationValue] = useState(WAREHOUSES[0].locations[0].value)
  const customLineCounter = useRef(0)

  const isDone = workflowState === 'done'
  const warehouse = WAREHOUSES.find((item) => item.value === warehouseValue) ?? WAREHOUSES[0]

  // recalculateReceiptSummary: derived from the line items on every render
  const productCount = lines.length
  const totalQty = formatQty(lines.reduce((sum, line) => sum + (parseQty(line.qty) ?? 0), 0))
  const invalidCount = lines.filter((line) => parseQty(line.qty) === null).length
  const qtyCheck =
    productCount === 0
      ? { text: 'No Items', isValid: false }
      : invalidCount > 0
        ? { text: `${invalidCount} Invalid ${plural(invalidCount, 'Line')}`, isValid: false }
        : { text: `${productCount} ${plural(productCount, 'Item')} > 0`, isValid: true }
  const ingestSummary = `${productCount} ${plural(productCount, 'SKU')} (${totalQty} ${plural(totalQty, 'Unit')})`

  function setReceiptWorkflowState(state: ReceiptWorkflowState) {
    setWorkflowState(state)
    if (state === 'done') setShowDuplicateWarning(false)
  }

  /** Validated receipts are immutable; returns true (and explains why) when an edit is blocked */
  function guardValidatedReceipt() {
    if (!isDone) return false
    showToast('Receipt already validated', `${RECEIPT_REF} is locked in the immutable stock ledger.`)
    return true
  }

  function confirmDiscardReceipt() {
    if (!isDone) {
      if (!window.confirm(`Discard receipt ${RECEIPT_REF}? Unsaved line items will be lost.`)) return
      showToast('Receipt discarded', `${RECEIPT_REF} was discarded. Stock balances are unchanged.`)
    }
    navigate(ROUTES.receipts)
  }

  function saveReceiptDraft() {
    if (guardValidatedReceipt()) return
    showToast('Draft saved', `${RECEIPT_REF} saved with ${productCount} ${plural(productCount, 'line')} (${totalQty} ${plural(totalQty, 'unit')}).`)
  }

  function openReceiptValidationModal() {
    if (guardValidatedReceipt()) return
    if (productCount === 0) {
      showToast('Nothing to validate', 'Add at least one product line before validating the receipt.')
      return
    }
    if (invalidCount > 0) {
      showToast('Check received quantities', 'Every line needs a strictly positive received quantity.')
      return
    }
    setIsValidationModalOpen(true)
  }

  function closeReceiptValidationModal() {
    setIsValidationModalOpen(false)
  }

  function executeReceiptValidation() {
    setIsValidationModalOpen(false)
    setReceiptWorkflowState('done')
    showToast('Receipt validated', `${RECEIPT_REF} · +${totalQty} units credited to ${warehouse.label}.`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function addSelectedProductFromCatalog(optionValue: string) {
    if (guardValidatedReceipt()) return
    const product = CATALOG.find((item) => catalogOptionValue(item) === optionValue)
    if (!product) return
    if (lines.some((line) => line.sku === product.sku)) {
      setShowDuplicateWarning(true)
      return
    }
    setShowDuplicateWarning(false)
    setLines((prev) => [...prev, { sku: product.sku, name: product.name, description: product.description, unit: product.unit, qty: '1' }])
  }

  function updateLineQty(sku: string, qty: string) {
    setLines((prev) => prev.map((line) => (line.sku === sku ? { ...line, qty } : line)))
  }

  function removeReceiptLine(sku: string) {
    if (guardValidatedReceipt()) return
    setLines((prev) => prev.filter((line) => line.sku !== sku))
  }

  function promptAddCustomProduct() {
    if (guardValidatedReceipt()) return
    const name = window.prompt('Custom line: enter the product name')?.trim()
    if (!name) return
    customLineCounter.current += 1
    const sku = `CUS-${String(customLineCounter.current).padStart(3, '0')}`
    setShowDuplicateWarning(false)
    setLines((prev) => [...prev, { sku, name, description: 'Custom line · Not in catalog', unit: 'PCS', qty: '1' }])
  }

  function updateReceivingLocations(event: ChangeEvent<HTMLSelectElement>) {
    const next = WAREHOUSES.find((item) => item.value === event.target.value) ?? WAREHOUSES[0]
    setWarehouseValue(next.value)
    setLocationValue(next.locations[0].value)
  }

  function hideDuplicateWarning() {
    setShowDuplicateWarning(false)
  }

  const badge = STATUS_BADGES[workflowState]

  return (
    <>
      <main className="w-full space-y-6 bg-slate-50/50 p-4 sm:p-6 lg:p-7 transition-all duration-150" id="view-receipt-new">
        {/* Interactive Workflow Mode Bar */}
        <div className="bg-indigo-50/60 border border-indigo-100/90 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-950">
            <span className="material-symbols-outlined text-indigo-600 text-[18px]">alt_route</span>
            <span>Receipt Workflow Scenario:</span>
            <span className="text-[11px] font-normal text-indigo-700 hidden sm:inline">Test draft creation vs validated immutable ledger state</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] bg-white p-0.5 rounded-lg border border-indigo-200/70 shadow-xs">
            <button className={isDone ? SCENARIO_INACTIVE : SCENARIO_ACTIVE} id="btnReceiptScenarioDraft" onClick={() => setReceiptWorkflowState('draft')}>
              <span className="material-symbols-outlined text-[13px]">edit_document</span> Draft Mode
            </button>
            <button className={isDone ? SCENARIO_ACTIVE : SCENARIO_INACTIVE} id="btnReceiptScenarioDone" onClick={() => setReceiptWorkflowState('done')}>
              <span className="material-symbols-outlined text-[13px]">verified</span> Validated (Done)
            </button>
            <div className="h-3.5 w-[1px] bg-slate-200 mx-1" />
            <button className="px-2.5 py-1 rounded-md font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1" onClick={() => navigate(productDetailPath('STL-001'))}>
              <span className="material-symbols-outlined text-[13px]">visibility</span> View Product Detail
            </button>
          </div>
        </div>

        {/* Breadcrumb & Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <button className="hover:text-indigo-600 font-medium flex items-center gap-1 transition-colors" onClick={() => navigate(ROUTES.receipts)}>
                <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                <span>Receipts</span>
              </button>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800">New Receipt</span>
              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-indigo-50 text-indigo-700 font-medium ml-1">/receipts/new</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Receipt</h1>
              <div className="flex items-center gap-1.5 text-xs font-semibold" id="receiptStatusBadgeContainer">
                <span className={badge.className} id="receiptStatusBadge">
                  <span className={badge.dot} />
                  {badge.label}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200" id="displayReceiptRefHeader">
                {RECEIPT_REF}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Record incoming stock from a vendor into warehouse inventory nodes.</p>
          </div>
          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-medium shadow-xs flex items-center gap-1.5 transition-all" id="btnReceiptCancel" onClick={confirmDiscardReceipt}>
              <span className="material-symbols-outlined text-[16px] text-slate-500">close</span>
              <span>Cancel</span>
            </button>
            <button className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all" id="btnReceiptSaveDraft" onClick={saveReceiptDraft}>
              <span className="material-symbols-outlined text-[16px] text-slate-500">bookmark</span>
              <span>Save Draft</span>
            </button>
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-[0.98]" id="btnReceiptValidateHeader" onClick={openReceiptValidationModal}>
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Validate Receipt</span>
            </button>
          </div>
        </div>

        {/* Workflow Step Indicator Ribbon */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Workflow Pipeline:</span>
            <div className="flex items-center gap-2" id="workflowPipelineSteps">
              {PIPELINE_STEPS.map((step, index) => {
                const isActive = step.activeIn === workflowState
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
              <span className="px-2 py-0.5 rounded-full text-slate-400 text-[11px]" id="stepCanceled">
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
        {isDone && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-900 flex items-start justify-between gap-3" id="receiptValidatedBanner">
            <div>
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                Receipt Validated &amp; Stock Ledger Updated
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                +{totalQty} total units have been immutably credited to <strong>Main Warehouse (West Hub) · Shelf B-04</strong>. Transaction reference: <strong>{RECEIPT_REF}</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold shadow-xs transition-colors" onClick={() => navigate(productDetailPath('STL-001'))}>
                View Stock in STL-001
              </button>
            </div>
          </div>
        )}

        {/* Duplicate Product Warning Banner */}
        {showDuplicateWarning && (
          <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-start gap-2.5" id="receiptDuplicateBanner">
            <span className="material-symbols-outlined text-amber-600 text-[18px] flex-shrink-0 mt-0.5">warning</span>
            <div className="flex-1 text-xs">
              <strong className="font-semibold text-amber-950">Duplicate item noticed:</strong> This product has already been added to the receipt. Update the existing line quantity instead of creating a duplicate row.
            </div>
            <button className="text-amber-800 hover:text-amber-950 text-xs font-semibold" onClick={hideDuplicateWarning}>
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
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">Incoming Dispatch</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Supplier Field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="rcptSupplierInput">
                      Supplier <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[16px]">corporate_fare</span>
                      <input
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                        defaultValue="Apex Industrial Metals Ltd."
                        id="rcptSupplierInput"
                        list="supplierSuggestions"
                        placeholder="Search supplier..."
                        type="text"
                      />
                      <datalist id="supplierSuggestions">
                        {SUPPLIERS.map((supplier) => (
                          <option key={supplier} value={supplier} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  {/* Receipt Date Display */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Receipt Date <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[16px]">calendar_today</span>
                      <input className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-not-allowed" readOnly type="text" value="Today, 05 Sep 2026" />
                    </div>
                  </div>
                  {/* Receiving Warehouse */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="rcptWarehouseSelect">
                      Receiving Warehouse <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select className={SELECT_CLASS} id="rcptWarehouseSelect" onChange={updateReceivingLocations} value={warehouseValue}>
                        {WAREHOUSES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400 text-base">unfold_more</span>
                    </div>
                  </div>
                  {/* Receiving Location */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="rcptLocationSelect">
                      Receiving Location <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select className={SELECT_CLASS} id="rcptLocationSelect" onChange={(e) => setLocationValue(e.target.value)} value={locationValue}>
                        {warehouse.locations.map((location) => (
                          <option key={location.value} value={location.value}>
                            {location.label}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined pointer-events-none absolute right-3 top-2.5 text-slate-400 text-base">unfold_more</span>
                    </div>
                  </div>
                </div>
                {/* Auto-generated reference preview banner */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">Reference:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{RECEIPT_REF}</span>
                    <span className="text-[10px] text-slate-400">(Auto-generated sequential ledger key)</span>
                  </div>
                  <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">Inbound PO: PO-2026-993</span>
                </div>
              </div>
            </div>

            {/* CARD B: Products Line Items Section */}
            <ReceiptLinesCard
              isLocked={isDone}
              lines={lines}
              onAddCustom={promptAddCustomProduct}
              onQtyChange={updateLineQty}
              onQuickAdd={addSelectedProductFromCatalog}
              onRemove={removeReceiptLine}
            />
          </div>

          {/* RIGHT COLUMN (5 Cols): Receipt Summary, Real-Time Calculations, and Ledger Impact */}
          <ReceiptSummaryCard onValidate={openReceiptValidationModal} productCount={productCount} qtyCheck={qtyCheck} totalQty={totalQty} warehouseLabel={warehouse.label} />
        </div>
      </main>

      {isValidationModalOpen && (
        <ReceiptValidationModal ingestSummary={ingestSummary} onCancel={closeReceiptValidationModal} onConfirm={executeReceiptValidation} warehouseLabel={warehouse.label} />
      )}
    </>
  )
}
