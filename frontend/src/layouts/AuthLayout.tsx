import { Outlet, useLocation, useNavigate } from 'react-router'
import { usePageChrome } from '../hooks/usePageChrome.ts'
import { placeholderLinkProps } from '../lib/placeholderLink.ts'
import { ROUTES } from '../routes.ts'

interface BottomLink {
  id: string
  /** Some prompts end with a space before the button and some don't, as in the original markup */
  prompt: string
  label: string
  to: string
}

const BOTTOM_LINKS: Record<string, BottomLink> = {
  [ROUTES.signup]: { id: 'bottomSignupLink', prompt: 'Already have an account? ', label: 'Sign in', to: ROUTES.login },
  [ROUTES.login]: { id: 'bottomLoginLink', prompt: "Don't have an account? ", label: 'Create account', to: ROUTES.signup },
  [ROUTES.forgotPassword]: { id: 'bottomForgotLink', prompt: 'Remember your password?', label: 'Sign in', to: ROUTES.login },
  [ROUTES.verifyOtp]: { id: 'bottomVerifyOtpLink', prompt: 'Need to sign in instead?', label: 'Sign in', to: ROUTES.login },
  [ROUTES.resetPassword]: { id: 'bottomResetPasswordLink', prompt: 'Need to return to sign in?', label: 'Sign in', to: ROUTES.login },
}

export default function AuthLayout() {
  usePageChrome('subtle-grid min-h-screen text-slate-800 antialiased font-sans flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900')
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const bottomLink = BOTTOM_LINKS[pathname]

  return (
    <>
      {/* Main Viewport Centered Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[460px]">
          {/* Active auth card */}
          <Outlet />

          {/* Contextual Bottom Routing Link Switcher */}
          <div className="text-center mt-6">
            {bottomLink && (
              <p className="text-xs text-slate-500" id={bottomLink.id}>
                {bottomLink.prompt}
                <button className="font-semibold text-blue-600 hover:text-blue-700 ml-1 focus:outline-none focus:underline" onClick={() => navigate(bottomLink.to)} type="button">
                  {bottomLink.label}
                </button>
              </p>
            )}
          </div>

          {/* Minimal Enterprise Compliance Footer Assurance */}
          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect height="11" rx="2" ry="2" width="18" x="3" y="11" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>End-to-end encrypted session · ISO 27001 compliant</span>
          </div>
        </div>
      </main>

      {/* Persistent Bottom System Bar */}
      <footer className="w-full px-6 py-3 border-t border-slate-200/80 bg-white/60 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>StockSense Core Auth Gateway · US-East-1 Cluster</span>
        </div>
        <div className="flex items-center gap-4">
          <a className="hover:text-slate-600 transition-colors" {...placeholderLinkProps}>Security Overview</a>
          <a className="hover:text-slate-600 transition-colors" {...placeholderLinkProps}>System Status</a>
          <a className="hover:text-slate-600 transition-colors" {...placeholderLinkProps}>Terms &amp; Privacy</a>
        </div>
      </footer>
    </>
  )
}
