import { useLayoutEffect } from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '../auth/useAuth.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { usePageChrome } from '../hooks/usePageChrome.ts'
import { ROUTES } from '../routes.ts'
import { HeroSection } from './landing/HeroSection.tsx'
import { FeaturesSection, FlowSection, HowItWorksSection } from './landing/InfoSections.tsx'

// In-page anchors; the html gets scroll-smooth so these glide to their sections
const HEADER_LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#flow', label: 'System Architecture' },
]
const FOOTER_LINKS = HEADER_LINKS.slice(0, 3)

const HEADER_PRIMARY = 'text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-sm shadow-indigo-200 transition flex items-center gap-1.5'
const CTA_PRIMARY = 'px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-900/40 transition active:scale-[0.99]'
const FOOTER_PRIMARY = 'hover:text-indigo-600 transition font-semibold text-indigo-600'

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

/** Public entry page (/). Signed-in visitors get "Go to Dashboard" in place of Login / Get Started. */
export default function LandingPage() {
  useDocumentTitle('StockSense IMS — Centralized Inventory Management System')
  usePageChrome('bg-[#fafbff] text-slate-800 font-sans antialiased min-h-screen flex flex-col selection:bg-indigo-100 selection:text-indigo-900', 'ss-landing scroll-smooth')
  const signedIn = useCurrentUser() !== null

  // The original links were full page loads; leaving (e.g. from the bottom CTA) opens the next screen at the top
  useLayoutEffect(() => () => window.scrollTo({ top: 0, behavior: 'instant' }), [])

  return (
    <>
      {/* TOP PUBLIC NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Title */}
          <Link className="flex items-center gap-2.5 group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} to={ROUTES.landing}>
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:bg-indigo-700 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" x2="12" y1="22.08" y2="12" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">StockSense</span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">IMS</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Inventory Management System</span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            {HEADER_LINKS.map((link) => (
              <a className="hover:text-indigo-600 transition" href={link.href} key={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action CTAs (Actual Application Routes) */}
          <div className="flex items-center gap-3">
            {signedIn ? (
              <Link className={HEADER_PRIMARY} to={ROUTES.dashboard}>
                <span>Go to Dashboard</span>
                <ChevronRightIcon />
              </Link>
            ) : (
              <>
                <Link className="text-sm font-semibold text-slate-700 hover:text-indigo-600 px-3.5 py-2 rounded-lg hover:bg-slate-50 transition" to={ROUTES.login}>
                  Login
                </Link>
                <Link className={HEADER_PRIMARY} to={ROUTES.signup}>
                  <span>Get Started</span>
                  <ChevronRightIcon />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <HeroSection signedIn={signedIn} />
        <FeaturesSection />
        <HowItWorksSection />
        <FlowSection />

        {/* CALL TO ACTION (CTA) SECTION */}
        <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">Ready to manage your inventory better?</h2>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">Start using StockSense to manage your inventory operations from one centralized system.</p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              {signedIn ? (
                <Link className={CTA_PRIMARY} to={ROUTES.dashboard}>
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link className={CTA_PRIMARY} to={ROUTES.signup}>
                    Get Started
                  </Link>
                  <Link className="px-7 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition active:scale-[0.99]" to={ROUTES.login}>
                    Login to Workspace
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* MINIMAL FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Description */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900">StockSense</span>{' '}
              <span className="text-xs text-slate-500 ml-2">Inventory Management System</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600">
            {FOOTER_LINKS.map((link) => (
              <a className="hover:text-indigo-600 transition" href={link.href} key={link.href}>
                {link.label}
              </a>
            ))}
            {signedIn ? (
              <Link className={FOOTER_PRIMARY} to={ROUTES.dashboard}>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link className="hover:text-indigo-600 transition" to={ROUTES.login}>
                  Login
                </Link>
                <Link className={FOOTER_PRIMARY} to={ROUTES.signup}>
                  Get Started
                </Link>
              </>
            )}
          </nav>

          {/* Copyright */}
          <div className="text-xs text-slate-400 font-mono">© {new Date().getFullYear()} StockSense</div>
        </div>
      </footer>
    </>
  )
}
