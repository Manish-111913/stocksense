import { Outlet, useLocation, useNavigate } from 'react-router'
import { usePageChrome } from '../hooks/usePageChrome.ts'
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
        </div>
      </main>

      {/* Persistent Bottom System Bar */}
      <footer className="w-full px-6 py-3 border-t border-slate-200/80 bg-white/60 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>StockSense</span>
        </div>
      </footer>
    </>
  )
}
