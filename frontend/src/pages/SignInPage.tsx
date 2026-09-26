import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { login } from '../api/auth.ts'
import { ApiError } from '../api/client.ts'
import { FieldError } from '../components/FieldError.tsx'
import { AlertCircleIcon, LogoMarkIcon } from '../components/icons.tsx'
import { PasswordInput } from '../components/PasswordInput.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { useFieldErrors } from '../hooks/useFieldErrors.ts'
import { inputClassName } from '../lib/inputClassName.ts'
import { validateEmail } from '../lib/validation.ts'
import { ROUTES } from '../routes.ts'

export default function SignInPage() {
  useDocumentTitle('StockSense — Sign In')
  const navigate = useNavigate()
  const { errors, setFieldError, clearFieldError } = useFieldErrors<'loginEmail' | 'loginPassword'>()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const emailVal = email.trim()
    let hasError = false

    if (!emailVal) {
      setFieldError('loginEmail', 'Email address is required')
      hasError = true
    } else if (!validateEmail(emailVal)) {
      setFieldError('loginEmail', 'Please enter a valid email address')
      hasError = true
    }

    if (!password) {
      setFieldError('loginPassword', 'Password is required')
      hasError = true
    }

    if (hasError) return

    setIsSubmitting(true)
    setAlertMessage(null)

    try {
      // On success GuestOnly redirects to the page that required sign-in (or the Dashboard)
      await login({ email: emailVal, password }, rememberMe)
    } catch (err) {
      setAlertMessage(err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04)] p-7 sm:p-9 transition-all" id="loginCard">
      {/* Header Branding & Purpose */}
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 mb-4 shadow-sm">
          <LogoMarkIcon />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1.5">Welcome back</h1>
        <p className="text-sm text-slate-500 font-normal">Sign in to continue to StockSense</p>
      </div>

      {/* Global Alert Notification Area */}
      {alertMessage && (
        <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium flex items-start gap-2.5" id="loginAlert">
          <AlertCircleIcon />
          <span id="loginAlertText">{alertMessage}</span>
        </div>
      )}

      {/* Login Form */}
      <form className="space-y-4" id="loginForm" noValidate onSubmit={handleSubmit}>
        {/* Email Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="loginEmail">
            Email address
          </label>
          <input
            autoComplete="email"
            autoFocus
            className={inputClassName(!!errors.loginEmail)}
            id="loginEmail"
            name="email"
            onChange={(e) => {
              setEmail(e.target.value)
              clearFieldError('loginEmail')
            }}
            placeholder="you@company.com"
            required
            type="email"
            value={email}
          />
          <FieldError id="loginEmailError" message={errors.loginEmail} />
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider" htmlFor="loginPassword">
              Password
            </label>
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 focus:outline-none focus:underline transition-colors" onClick={() => navigate(ROUTES.forgotPassword)} tabIndex={4} type="button">
              Forgot password?
            </button>
          </div>
          <PasswordInput
            autoComplete="current-password"
            hasError={!!errors.loginPassword}
            id="loginPassword"
            name="password"
            onChange={(e) => {
              setPassword(e.target.value)
              clearFieldError('loginPassword')
            }}
            placeholder="Enter your password"
            required
            value={password}
          />
          <FieldError id="loginPasswordError" message={errors.loginPassword} />
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              checked={rememberMe}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer"
              id="loginRememberMe"
              name="remember"
              onChange={(e) => setRememberMe(e.target.checked)}
              tabIndex={3}
              type="checkbox"
            />
            <span className="text-xs text-slate-600 font-medium">Keep me signed in on this device</span>
          </label>
        </div>

        {/* Primary Submit Action Button */}
        <div className="pt-2">
          <SubmitButton
            disabledOpacity="disabled:opacity-60"
            id="loginSubmitBtn"
            isLoading={isSubmitting}
            label="Sign In"
            loadingLabel="Signing in..."
            tabIndex={5}
            textId="loginSubmitBtnText"
          />
        </div>
      </form>
    </div>
  )
}
