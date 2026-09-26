import { CARRIER_DETAILS, DETAIL_LINES, VALIDATED_LEDGER_ID } from '../data.ts'

interface DeliveryDetailViewProps {
  active: boolean
  orderRef: string
  /** Set once any delivery validation posts: reveals the banner and completes step 4 */
  ledgerPosted: boolean
  onCancelOrder: (ref: string) => void
  onPrintPickList: (ref: string) => void
  onValidate: () => void
  onViewLedger: (ledgerId: string) => void
}

const BANNER_CLASS = 'p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs items-center justify-between'

// VIEW 3: DELIVERY DETAIL & WORKFLOW STAGE VIEW (/deliveries/[id])
export function DeliveryDetailView({ active, orderRef, ledgerPosted, onCancelOrder, onPrintPickList, onValidate, onViewLedger }: DeliveryDetailViewProps) {
  return (
    <div className={active ? 'flex-col space-y-6 pt-6 flex' : 'hidden flex-col space-y-6 pt-6'} id="viewDeliveryDetail">
      {/* Detail Order Header & Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">local_shipping</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-md text-headline-md text-slate-900 font-bold" id="detailOrderRef">{orderRef}</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200" id="detailBadgeStatus">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  Ready (Packed)
                </span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>
                  Customer: <strong className="text-slate-800">Nexa Dynamics Corp</strong>
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  Destination: <strong className="text-slate-800">Bangalore Tech Park</strong>
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-slate-400">Created: 05 Sep 2026, 09:30</span>
              </div>
            </div>
          </div>
          {/* Detail Actions Toolbar (hard-wired to WH/OUT/00184 in the original) */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button className="px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors" id="btnDetailCancel" onClick={() => onCancelOrder('WH/OUT/00184')}>
              Cancel Order
            </button>
            <button className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1" id="btnDetailPrint" onClick={() => onPrintPickList('WH/OUT/00184')}>
              <span className="material-symbols-outlined text-[15px]">print</span>
              <span>Print Manifesto</span>
            </button>
            <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all" id="btnDetailValidate" onClick={onValidate}>
              <span className="material-symbols-outlined text-[16px]">task_alt</span>
              <span>Validate Delivery</span>
            </button>
          </div>
        </div>
        {/* Enterprise Apple-aesthetic Workflow Stepper */}
        <div className="py-2">
          <div className="relative flex items-center justify-between">
            {/* Step 1: Draft */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <span className="material-symbols-outlined text-[16px]">check</span>
              </div>
              <span className="mt-2 text-xs font-semibold text-slate-900">1. Draft</span>
              <span className="text-[10px] text-slate-400 font-mono">09:30 IST</span>
            </div>
            {/* Connecting Line 1-2 */}
            <div className="flex-1 h-0.5 bg-emerald-500 mx-2" />
            {/* Step 2: Waiting / Picking */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <span className="material-symbols-outlined text-[16px]">check</span>
              </div>
              <span className="mt-2 text-xs font-semibold text-slate-900">2. Pick Verified</span>
              <span className="text-[10px] text-slate-400 font-mono">11:15 IST</span>
            </div>
            {/* Connecting Line 2-3 */}
            <div className="flex-1 h-0.5 bg-indigo-600 mx-2" />
            {/* Step 3: Ready / Packing (Active) */}
            <div className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-indigo-600 ring-4 ring-indigo-100 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                <span className="material-symbols-outlined text-[16px]">package_2</span>
              </div>
              <span className="mt-2 text-xs font-bold text-indigo-700">3. Ready / Pack</span>
              <span className="text-[10px] text-indigo-600 font-semibold font-mono">Current Phase</span>
            </div>
            {/* Connecting Line 3-4 */}
            <div className={ledgerPosted ? 'flex-1 h-0.5 bg-emerald-500 mx-2' : 'flex-1 h-0.5 bg-slate-200 mx-2'} id="stepLineDone" />
            {/* Step 4: Done / Validated */}
            <div className="flex flex-col items-center relative z-10">
              <div className={ledgerPosted ? 'w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs' : 'w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center font-bold text-xs'} id="stepCircleDone">
                <span className="material-symbols-outlined text-[16px]">done_all</span>
              </div>
              <span className={ledgerPosted ? 'mt-2 text-xs font-semibold text-emerald-800' : 'mt-2 text-xs font-medium text-slate-400'} id="stepLabelDone">
                4. Ledger Posted
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Awaiting Post</span>
            </div>
          </div>
        </div>
      </div>
      {/* Completed State Post-Ledger Banner (Dynamic Reveal) */}
      <div className={ledgerPosted ? BANNER_CLASS : `hidden ${BANNER_CLASS}`} id="detailValidatedBanner">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-emerald-600 text-[22px]">verified</span>
          <div>
            <h4 className="font-bold text-emerald-900">Delivery Validated &amp; Atomic Ledger Committed</h4>
            <p className="text-emerald-800 text-[11px]">Stock Ledger entry #LEDGER-8941 posted permanently. Inventory counts decremented in Stock Bay 04-A.</p>
          </div>
        </div>
        <button className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors" onClick={() => onViewLedger(VALIDATED_LEDGER_ID)}>
          Inspect Ledger Hash
        </button>
      </div>
      {/* Split-Pane Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Detailed Lines Inspection Table */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-headline-sm text-headline-sm text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600 text-[18px]">checklist</span>
              <span>Picked Items Verification Manifesto</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">2 of 2 Lines 100% Picked</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[11px] font-label-sm uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                  <th className="py-2 font-semibold">Line Item</th>
                  <th className="py-2 font-semibold">SKU</th>
                  <th className="py-2 font-semibold">Location</th>
                  <th className="py-2 font-semibold text-center">Progress</th>
                  <th className="py-2 font-semibold text-right">Picked / Target</th>
                  <th className="py-2 text-center w-16">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-body-sm text-slate-700">
                {DETAIL_LINES.map((line) => (
                  <tr key={line.sku}>
                    <td className="py-3">
                      <div className="font-semibold text-slate-900">{line.name}</div>
                      <div className="text-[11px] text-slate-400">{line.note}</div>
                    </td>
                    <td className="py-3 font-mono font-medium text-slate-600">{line.sku}</td>
                    <td className="py-3 text-slate-600">
                      <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">{line.location}</span>
                    </td>
                    <td className="py-3 text-center">
                      <div className="w-20 bg-slate-100 rounded-full h-1.5 mx-auto overflow-hidden">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }} />
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900">{line.picked}</td>
                    <td className="py-3 text-center">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">task_alt</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600 text-[18px]">qr_code_scanner</span>
              <span>
                Pallet Barcode: <strong className="font-mono text-slate-800">PLT-8820-BLR</strong> scanned by Manish
              </span>
            </div>
            <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">done</span> Barcode match verified
            </span>
          </div>
        </div>
        {/* Right Column: Ledger Preview & Dispatch Metadata */}
        <div className="lg:col-span-4 space-y-5">
          {/* Immutable Stock Ledger Impact Preview */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-headline-sm text-headline-sm text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-indigo-600 text-[18px]">account_balance</span>
                <span>Stock Ledger Preview</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Pre-Commit</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-2">
              <div className="text-slate-400 flex justify-between">
                <span>TRANSACTION TYPE:</span>
                <span className="text-indigo-400 font-bold">STOCK.DECREMENT</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1 text-rose-300">
                <span>CHR-002:</span>
                <span>-10 PCS (Bay 04-A)</span>
              </div>
              <div className="flex justify-between text-rose-300">
                <span>STL-001:</span>
                <span>-40 KG (Bay 04-A)</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1 text-slate-400">
                <span>LEDGER STATE:</span>
                <span className={ledgerPosted ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'} id="ledgerPreviewState">
                  {ledgerPosted ? 'COMMITTED_LEDGER_8941' : 'PENDING_VALIDATION'}
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 leading-relaxed">
              Validation commits this receipt permanently to the <strong>Stock Ledger</strong>. Inventory levels will immediately decrease, and this action cannot be undone.
            </div>
          </div>
          {/* Carrier & Driver Logistics Staging */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5 text-xs">
            <h4 className="font-headline-sm text-headline-sm text-slate-900 pb-1 border-b border-slate-100">Carrier Dispatch Staging</h4>
            {CARRIER_DETAILS.map((detail) => (
              <div className="flex justify-between" key={detail.label}>
                <span className="text-slate-500">{detail.label}</span>
                <span className={detail.valueClass}>{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
