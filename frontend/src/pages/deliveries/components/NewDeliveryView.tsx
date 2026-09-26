import { Fragment, useRef, useState } from 'react'
import { useToast } from '../../../context/toast.ts'
import { LINE_PRODUCTS, NEW_WAREHOUSE_OPTIONS, QTY_INPUT_OVER, sourceLocationOptions, type LineProductKey } from '../data.ts'

interface NewLine {
  uid: number
  product: LineProductKey
  /** Qty exceeds available stock: reveals the inline alert row and tints the input */
  over: boolean
}

const INITIAL_LINES: NewLine[] = [
  { uid: 1, product: 'chair', over: false },
  { uid: 2, product: 'steel', over: false },
]

interface NewDeliveryViewProps {
  active: boolean
  onDiscard: () => void
  onSubmitForPicking: () => void
  onSaveAsDraft: () => void
}

// VIEW 2: CREATE DELIVERY ORDER (/deliveries/new). Stays mounted while hidden, like the original's show/hide
export function NewDeliveryView({ active, onDiscard, onSubmitForPicking, onSaveAsDraft }: NewDeliveryViewProps) {
  const { showToast } = useToast()
  const [warehouse, setWarehouse] = useState('WH-West')
  const [lines, setLines] = useState<NewLine[]>(INITIAL_LINES)
  const [totalLinesLabel, setTotalLinesLabel] = useState('2 lines')
  const nextUid = useRef(3)

  function validateLineQty(uid: number, value: string, maxAvail: number) {
    const over = parseFloat(value) > maxAvail
    setLines((rows) => rows.map((line) => (line.uid === uid ? { ...line, over } : line)))
  }

  function removeLineRow(uid: number) {
    setLines((rows) => rows.filter((line) => line.uid !== uid))
    showToast('Line Removed', 'Product line detached from delivery manifesto.')
  }

  function addNewProductLine() {
    const uid = nextUid.current++
    setLines((rows) => [...rows, { uid, product: 'aluminium', over: false }])
    setTotalLinesLabel('3 lines')
    showToast('Line Added', 'Added Aluminium Extrusion Bar 100mm (SKU: ALU-100).')
  }

  return (
    <div className={active ? 'flex-col space-y-6 pt-6 flex' : 'hidden flex-col space-y-6 pt-6'} id="viewDeliveryNew">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h2 className="font-headline-md text-headline-md text-slate-900 tracking-tight">New Delivery Order</h2>
          <p className="text-xs text-slate-500">Record and verify outgoing inventory for customer fulfillment. No billing or taxes involved.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors" onClick={onDiscard}>
            Discard Draft
          </button>
          <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5" onClick={onSubmitForPicking}>
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>Submit for Picking</span>
          </button>
        </div>
      </div>
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
                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] font-bold text-slate-700">WH/OUT/00185 (Auto)</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Customer / Destination <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" defaultValue="Nexa Dynamics Corp · CUST-9042" id="inputNewCustomer" placeholder="Type customer entity or warehouse terminal..." type="text" />
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[17px]">business</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Destination Warehouse <span className="text-rose-500">*</span>
                </label>
                <select className="w-full py-2 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-label-md focus:outline-none focus:border-indigo-500" id="selectNewWarehouse" onChange={(e) => setWarehouse(e.target.value)} value={warehouse}>
                  {NEW_WAREHOUSE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Source Location <span className="text-rose-500">*</span>
                </label>
                {/* Re-keyed per warehouse: the original rewrites the options, which resets the selection */}
                <select className="w-full py-2 px-3 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 font-label-md focus:outline-none focus:border-indigo-500" id="selectNewSourceLoc" key={warehouse}>
                  {sourceLocationOptions(warehouse).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Scheduled Delivery Date</label>
                <input className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium" readOnly type="text" value="Today, 05 Sep 2026" />
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-[18px]">inventory</span>
                <h3 className="font-headline-sm text-headline-sm text-slate-900">Line Items &amp; Stock Availability</h3>
              </div>
              <button className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 transition-colors" onClick={addNewProductLine}>
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>Add Product Line</span>
              </button>
            </div>
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
                  {lines.map((line) => {
                    const product = LINE_PRODUCTS[line.product]
                    return (
                      <Fragment key={line.uid}>
                        <tr className="align-middle">
                          <td className="py-3 pr-2">
                            <div className="font-semibold text-slate-900">{product.name}</div>
                            <div className="text-[11px] text-slate-400">{product.category}</div>
                          </td>
                          <td className="py-3 font-mono font-medium text-slate-600">{product.sku}</td>
                          <td className="py-3 text-right">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                              <span className="material-symbols-outlined text-[12px]">check_circle</span>
                              {product.available}
                            </span>
                          </td>
                          <td className="py-3 text-center text-slate-500 font-mono">{product.unit}</td>
                          <td className="py-3 text-right">
                            <input
                              className={line.over ? `${product.inputClass} ${QTY_INPUT_OVER}` : product.inputClass}
                              defaultValue={product.defaultQty}
                              id={product.inputId}
                              max={product.max}
                              min={1}
                              onChange={product.alert ? (e) => validateLineQty(line.uid, e.target.value, product.max) : undefined}
                              type="number"
                            />
                          </td>
                          <td className="py-3 text-right">
                            <button className="text-slate-300 hover:text-rose-500 p-1 rounded transition-colors" onClick={() => removeLineRow(line.uid)}>
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </td>
                        </tr>
                        {/* Inline Alert Container */}
                        {product.alert && (
                          <tr className={line.over ? undefined : 'hidden'} id={product.alert.id}>
                            <td className="pb-3 pt-0" colSpan={6}>
                              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-600 text-[16px]">warning</span>
                                <span>
                                  <strong>{product.alert.title}</strong> {product.alert.message}
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
              <span className="text-slate-400 text-[11px]">Real-time stock reservation lock is applied upon picking submission.</span>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition-colors" onClick={onSaveAsDraft}>
                  Save as Draft
                </button>
                <button className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs transition-colors flex items-center gap-1" onClick={onSubmitForPicking}>
                  <span className="material-symbols-outlined text-[15px]">send</span>
                  <span>Submit for Picking</span>
                </button>
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
              <span className="font-mono text-xs text-indigo-600 font-semibold">WH/OUT/00185</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Total Line Items:</span>
                <span className="font-mono font-bold text-slate-900" id="summaryTotalLines">{totalLinesLabel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Unique Products:</span>
                <span className="font-semibold text-slate-800">2 SKUs</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Warehouse:</span>
                <span className="font-medium text-slate-800">Main Warehouse (West)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Source Location:</span>
                <span className="font-medium text-slate-800">Stock Bay 04-A</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Ledger Impact:</span>
                <span className="font-mono text-amber-700 font-semibold">Pending Picking</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Stock Decrement:</span>
                <span className="font-mono font-bold text-indigo-700">-50 Units total</span>
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
              Stock is <strong>NOT deducted</strong> upon draft creation or save. Available stock counters remain informational until operational warehouse validation by the Inventory Admin.
            </p>
            <div className="pt-1 border-t border-indigo-200/50 flex items-center justify-between text-[10px] text-indigo-700 font-mono">
              <span>Ledger: Atomic Deduct</span>
              <span>Zero Double Counts</span>
            </div>
          </div>
          {/* Live Warehouse Berth Telemetry Block */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Dock Staging Berth 04</span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Clear
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '35%' }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Berth Capacity: 35%</span>
              <span>Dispatch ETA: 14:00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
