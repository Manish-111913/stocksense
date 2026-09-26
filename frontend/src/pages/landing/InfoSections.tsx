import { Fragment, type ReactNode } from 'react'

interface Feature {
  title: string
  description: string
  icon: ReactNode
}

const FEATURES: Feature[] = [
  {
    title: 'Product Management',
    description: 'Manage products, SKUs, categories, units of measure, and automated reorder levels across catalog classifications.',
    icon: (
      <>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" x2="12" y1="22.08" y2="12" />
      </>
    ),
  },
  {
    title: 'Warehouse & Locations',
    description: 'Organize multi-hub facility topologies into organized internal storage bays, dispatch staging docks, and temperature-controlled bins.',
    icon: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
  },
  {
    title: 'Stock Operations',
    description: 'Handle incoming vendor receipts, customer dispatch deliveries, inter-bay internal transfers, and physical count adjustments.',
    icon: (
      <>
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </>
    ),
  },
  {
    title: 'Real-Time Stock',
    description: 'Track current on-hand stock quantities across specific location nodes without manual reconciliation overhead.',
    icon: (
      <>
        <rect height="14" rx="2" ry="2" width="20" x="2" y="7" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </>
    ),
  },
  {
    title: 'Stock Ledger',
    description: 'Maintain an immutable, chronological history of inventory movements with strict transaction signatures and audit logs.',
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </>
    ),
  },
  {
    title: 'Operations Dashboard',
    description: 'Get an immediate centralized overview of warehouse health, active SKU allocations, and pending operational transfers.',
    icon: (
      <>
        <rect height="7" width="7" x="3" y="3" />
        <rect height="7" width="7" x="14" y="3" />
        <rect height="7" width="7" x="14" y="14" />
        <rect height="7" width="7" x="3" y="14" />
      </>
    ),
  },
]

interface Step {
  number: string
  title: string
  description: string
  dotClass: string
  tag: string
}

const STEPS: Step[] = [
  { number: '01', title: 'Add', description: 'Add your products, SKU codes, categories, warehouses, and storage locations into the system.', dotClass: 'bg-slate-400', tag: 'Master Configuration' },
  { number: '02', title: 'Operate', description: 'Record receipts, deliveries, internal bay transfers, and physical cycle count adjustments.', dotClass: 'bg-indigo-500', tag: 'Transactional Events' },
  { number: '03', title: 'Track', description: 'Stock quantities update automatically as inventory operations are validated through backend transactions.', dotClass: 'bg-emerald-500', tag: 'Atomic Validation' },
  { number: '04', title: 'Monitor', description: 'Use the dashboard and immutable stock ledger to audit movements and understand real-time inventory standing.', dotClass: 'bg-blue-500', tag: 'Immutable Ledger' },
]

interface FlowStage {
  title: string
  description: string
  icon: ReactNode
}

// Receipt -> Stock -> Transfer -> Delivery, each followed by an arrow, then the Stock Ledger
const FLOW_STAGES: FlowStage[] = [
  {
    title: 'Receipt',
    description: 'Inbound Vendor Intake',
    icon: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
      </>
    ),
  },
  {
    title: 'Stock',
    description: 'Assigned to Bay / Bin',
    icon: (
      <>
        <rect height="14" rx="2" ry="2" width="20" x="2" y="7" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </>
    ),
  },
  {
    title: 'Transfer',
    description: 'Inter-Bay Redistribution',
    icon: (
      <>
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </>
    ),
  },
  {
    title: 'Delivery',
    description: 'Outbound Pick & Pack',
    icon: (
      <>
        <rect height="13" width="15" x="1" y="3" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </>
    ),
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 bg-white border-y border-slate-200/80" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider">Functional Modules</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Everything you need to manage inventory</h2>
          <p className="text-slate-600 text-base">Engineered strictly for inventory fidelity — avoiding bloated CRM, e-commerce, or banking complexities.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {FEATURES.map((feature) => (
            <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-6 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 hover:border-indigo-200 transition-all group" key={feature.title}>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-5 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  {feature.icon}
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition">{feature.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HowItWorksSection() {
  return (
    <section className="py-20 bg-[#fafbff]" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider">Workflow Sequence</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">How It Works</h2>
          <p className="text-slate-600 text-base">From initial master data setup to validated movement postings in four clear steps.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {STEPS.map((step, index) => (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative flex flex-col justify-between" key={step.number}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">{step.number}</span>
                  <span className="text-xs font-mono text-slate-400">Step {index + 1}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-medium text-slate-500 gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${step.dotClass}`} />
                <span>{step.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FlowArrowRight() {
  return (
    <div className="flow-arrow-right text-slate-400 my-1 md:my-0 md:px-2">
      <svg className="w-5 h-5 hidden md:block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="5" x2="19" y1="12" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
      <svg className="w-5 h-5 md:hidden" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="12" x2="12" y1="5" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </svg>
    </div>
  )
}

/** Inventory flow visual (architectural / conceptual only) */
export function FlowSection() {
  return (
    <section className="py-16 bg-white border-t border-slate-200/80" id="flow">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <div className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider">System Pipeline</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Inventory Flow Architecture</h2>
          <p className="text-sm text-slate-500">How physical items transition across StockSense operations without data duplication.</p>
        </div>

        {/* Horizontal Flow (Desktop) & Vertical (Mobile) */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2">
            {FLOW_STAGES.map((stage) => (
              <Fragment key={stage.title}>
                <div className="w-full md:w-auto flex-1 bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                  <div className="text-indigo-600 mb-2 flex justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      {stage.icon}
                    </svg>
                  </div>
                  <div className="text-sm font-bold text-slate-800">{stage.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{stage.description}</div>
                </div>

                <FlowArrowRight />
              </Fragment>
            ))}

            {/* Flow 5: Stock Ledger */}
            <div className="w-full md:w-auto flex-1 bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-center shadow-sm">
              <div className="text-indigo-700 mb-2 flex justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="text-sm font-bold text-indigo-950">Stock Ledger</div>
              <div className="text-[11px] text-indigo-700 mt-0.5">Cryptographic Commit</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
