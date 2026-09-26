import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '../../routes.ts'

interface PipelineNode {
  step: string
  title: string
  description: string
  icon: ReactNode
}

// Operational pipeline concept (illustrative only, no live numbers): steps 01-04, then the ledger
const PIPELINE_NODES: PipelineNode[] = [
  {
    step: '01',
    title: 'Products & Catalog',
    description: 'Master SKU specifications & units of measure',
    icon: <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
  },
  {
    step: '02',
    title: 'Warehouse Topologies',
    description: 'Bays, cold bins & discrete staging zones',
    icon: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  },
  {
    step: '03',
    title: 'Synchronized Stock',
    description: 'On-hand quantities categorized per location',
    icon: (
      <>
        <rect height="14" rx="2" ry="2" width="20" x="2" y="7" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </>
    ),
  },
  {
    step: '04',
    title: 'Atomic Operations',
    description: 'Receipts · Deliveries · Transfers · Adjustments',
    icon: (
      <>
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </>
    ),
  },
]

const ARCHITECTURE_TAGS = ['Centralized Multi-Warehouse', 'Cryptographic Stock Ledger', 'Zero Fake Data']

function FlowArrowDown() {
  return (
    <div className="flow-arrow-down text-indigo-500 py-0.5">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <line x1="12" x2="12" y1="5" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </svg>
    </div>
  )
}

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
      <line x1="5" x2="19" y1="12" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

const PRIMARY_BUTTON = 'inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-100 transition active:scale-[0.99]'

/** Hero: value proposition, entry buttons and the conceptual pipeline card */
export function HeroSection({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden" id="home">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-50/70 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Clear Value Proposition */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold tracking-wider uppercase font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              Inventory Management System
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Manage your inventory.
              <br />
              <span className="text-indigo-600">Simplify your operations.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              StockSense brings products, warehouses, stock movements, receipts, deliveries, transfers, and adjustments into one centralized, backend-driven inventory management system.
            </p>

            {/* Navigation Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              {signedIn ? (
                <Link className={PRIMARY_BUTTON} to={ROUTES.dashboard}>
                  <span>Go to Dashboard</span>
                  <ArrowRightIcon />
                </Link>
              ) : (
                <>
                  <Link className={PRIMARY_BUTTON} to={ROUTES.signup}>
                    <span>Get Started</span>
                    <ArrowRightIcon />
                  </Link>
                  <Link className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 shadow-sm transition active:scale-[0.99]" to={ROUTES.login}>
                    <span>Login to Workspace</span>
                  </Link>
                </>
              )}
            </div>

            {/* Authentic Architecture Tags */}
            <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
              {ARCHITECTURE_TAGS.map((tag) => (
                <div className="flex items-center gap-1.5" key={tag}>
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>{tag}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Abstract Conceptual Inventory Flow (NO FAKE STATS) */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 relative">
              <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="ml-2 text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">Operational Pipeline Concept</span>
                </div>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Deterministic Flow</span>
              </div>

              {/* Vertical Flow Visual */}
              <div className="flex flex-col items-center space-y-3 relative">
                {PIPELINE_NODES.map((node) => (
                  <Fragment key={node.step}>
                    <div className="w-full bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl p-3.5 flex items-center justify-between transition group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-mono font-bold text-xs">{node.step}</div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition">{node.title}</div>
                          <div className="text-[11px] text-slate-500">{node.description}</div>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        {node.icon}
                      </svg>
                    </div>

                    {/* Subtle Flow Arrow */}
                    <FlowArrowDown />
                  </Fragment>
                ))}

                {/* Node 5: Immutable Ledger */}
                <div className="w-full bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">05</div>
                    <div>
                      <div className="text-sm font-bold text-indigo-950">Immutable Stock Ledger</div>
                      <div className="text-[11px] text-indigo-700">Cryptographically chained movement audit trail</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">SSOT</span>
                </div>
              </div>

              {/* Contextual note */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Single source of truth</span>
                <span>Audit-proof ledger</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
