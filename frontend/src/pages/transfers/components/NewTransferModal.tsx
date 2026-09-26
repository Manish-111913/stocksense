import { useState } from 'react'
import { useToast } from '../../../context/toast.ts'
import {
  DEST_LOCATION_OPTIONS,
  DEST_WAREHOUSE_OPTIONS,
  MAX_TRANSFER_QTY,
  SOURCE_LOCATION_OPTIONS,
  SOURCE_WAREHOUSE_OPTIONS,
  type SelectOption,
} from '../data.ts'

const MODAL_OPEN = 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4'
const MODAL_CLOSED = 'fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs hidden flex items-center justify-center p-4'

const LOCATION_WARNING = 'p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2'
const LOCATION_WARNING_HIDDEN = 'hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2'
const STOCK_WARNING = 'p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-1.5'
const STOCK_WARNING_HIDDEN = 'hidden p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-1.5'

interface LocationSelectProps {
  id: string
  label: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
}

function LocationSelect({ id, label, options, value, onChange }: LocationSelectProps) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-600 mb-1">{label}</label>
      <select className="w-full bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 font-medium cursor-pointer" id={id} onChange={(e) => onChange(e.target.value)} value={value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface NewTransferModalProps {
  open: boolean
  onClose: () => void
}

type LocationField = 'srcW' | 'srcL' | 'dstW' | 'dstL'

// Create new internal transfer modal. Like the original, picks and quantity persist between openings;
// only the two warnings are cleared on close.
export function NewTransferModal({ open, onClose }: NewTransferModalProps) {
  const { showToast } = useToast()
  const [locations, setLocations] = useState<Record<LocationField, string>>({
    srcW: SOURCE_WAREHOUSE_OPTIONS[0].value ?? '',
    srcL: SOURCE_LOCATION_OPTIONS[0].value ?? '',
    dstW: DEST_WAREHOUSE_OPTIONS[0].value ?? '',
    dstL: DEST_LOCATION_OPTIONS[0].value ?? '',
  })
  const [qty, setQty] = useState('150')
  const [showLocationWarning, setShowLocationWarning] = useState(false)
  const [showStockWarning, setShowStockWarning] = useState(false)

  function closeNewTransferModal() {
    setShowStockWarning(false)
    setShowLocationWarning(false)
    onClose()
  }

  // Location conflict check
  function validateLocations(field: LocationField, value: string) {
    const next = { ...locations, [field]: value }
    setLocations(next)
    setShowLocationWarning(next.srcW === next.dstW && next.srcL === next.dstL)
  }

  // Real-time stock limit check
  function checkStockLimit(value: string) {
    setQty(value)
    setShowStockWarning(parseFloat(value) > MAX_TRANSFER_QTY)
  }

  function confirmNewTransfer() {
    if (parseFloat(qty) > MAX_TRANSFER_QTY) {
      window.alert('Cannot stage transfer: Quantity exceeds available stock at source location.')
      return
    }
    closeNewTransferModal()
    showToast('Transfer WH/INT/00143 Staged', '150 KG Steel Rod staged and ready for dock verification.')
  }

  return (
    <div className={open ? MODAL_OPEN : MODAL_CLOSED} id="newTransferModal">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">New Internal Transfer</h3>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60">/transfers/new</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Move stock between internal locations. Total stock across nodes stays constant.</p>
          </div>
          <button className="w-8 h-8 rounded-lg hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors" onClick={closeNewTransferModal} type="button">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs max-h-[75vh]">
          {/* Location Picker Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            {/* Source Panel */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <span className="material-symbols-outlined text-[16px] text-slate-500">upload</span>
                Source Node &amp; Location
              </div>
              <LocationSelect id="modalSourceWarehouse" label="Source Warehouse" onChange={(v) => validateLocations('srcW', v)} options={SOURCE_WAREHOUSE_OPTIONS} value={locations.srcW} />
              <LocationSelect id="modalSourceLocation" label="Source Internal Location" onChange={(v) => validateLocations('srcL', v)} options={SOURCE_LOCATION_OPTIONS} value={locations.srcL} />
            </div>
            {/* Destination Panel */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <span className="material-symbols-outlined text-[16px] text-indigo-600">download</span>
                Destination Node &amp; Location
              </div>
              <LocationSelect id="modalDestWarehouse" label="Destination Warehouse" onChange={(v) => validateLocations('dstW', v)} options={DEST_WAREHOUSE_OPTIONS} value={locations.dstW} />
              <LocationSelect id="modalDestLocation" label="Destination Internal Location" onChange={(v) => validateLocations('dstL', v)} options={DEST_LOCATION_OPTIONS} value={locations.dstL} />
            </div>
          </div>
          {/* Realtime Location Validation Error */}
          <div className={showLocationWarning ? LOCATION_WARNING : LOCATION_WARNING_HIDDEN} id="locationWarning">
            <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
            <span>Source and destination locations cannot be identical. Please pick distinct internal nodes.</span>
          </div>
          {/* Product Line Selector Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">Transfer Items &amp; Stock Availability</span>
              <span className="font-mono text-[11px] text-slate-400">Live Ledger Check</span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 font-semibold text-[10px] text-slate-400 uppercase tracking-wider px-2">
                <div className="col-span-5">Product &amp; SKU</div>
                <div className="col-span-3 text-right">Available at Source</div>
                <div className="col-span-2 text-center">Unit</div>
                <div className="col-span-2 text-right">Transfer Qty</div>
              </div>
              {/* Item Row */}
              <div className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <div className="col-span-5 flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px]">STL</div>
                  <div>
                    <div className="font-semibold text-slate-900">Steel Rod 20mm</div>
                    <div className="font-mono text-[10px] text-slate-400">SKU: STL-001 · Hot Rolled</div>
                  </div>
                </div>
                <div className="col-span-3 text-right">
                  <div className="font-mono font-bold text-emerald-700">500.00</div>
                  <div className="text-[9px] text-slate-400">Unreserved in Bay 04-A</div>
                </div>
                <div className="col-span-2 text-center font-mono text-slate-500">KG</div>
                <div className="col-span-2 text-right">
                  <input className="w-full text-right font-mono font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:border-indigo-500 text-xs" id="transferQtyInput" max="500" min="1" onChange={(e) => checkStockLimit(e.target.value)} type="number" value={qty} />
                </div>
              </div>
              {/* Stock Exceeded Alert */}
              <div className={showStockWarning ? STOCK_WARNING : STOCK_WARNING_HIDDEN} id="stockExceededWarning">
                <span className="material-symbols-outlined text-[15px] text-rose-600">warning</span>
                <span>Insufficient stock available at the source location (Maximum: 500 KG).</span>
              </div>
            </div>
          </div>
          {/* Transfer Overview Summary Card */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs text-indigo-950">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600 text-lg">sync_alt</span>
              <div>
                <span className="font-semibold">Move:</span> 150 KG Steel Rod 20mm
                <span className="text-indigo-700 font-mono block text-[11px]">Main Warehouse / Stock Bay 04-A → East Depot / Receiving Dock Bay 01</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-white text-indigo-700 border border-indigo-200/80">1 Line</span>
          </div>
        </div>
        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <button className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors" onClick={closeNewTransferModal} type="button">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-xs transition-all" onClick={closeNewTransferModal} type="button">
              Save Draft
            </button>
            <button className="px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-[0.98] transition-all" onClick={confirmNewTransfer} type="button">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              <span>Confirm &amp; Stage</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
