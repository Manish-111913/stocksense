import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { FieldError } from '../components/FieldError.tsx'
import { AlertCircleIcon, ChevronLeftIcon } from '../components/icons.tsx'
import { PasswordInput } from '../components/PasswordInput.tsx'
import { PasswordLengthHint, PasswordMatchHint } from '../components/PasswordHints.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { useFieldErrors } from '../hooks/useFieldErrors.ts'
import { ROUTES } from '../routes.ts'

type ResetField = 'resetNewPassword' | 'resetConfirmPassword'

interface ResetAlert {
  message: string
  /** Shows the "Start again" link back to Forgot Password */
  isExpired: boolean
}

export default function ResetPasswordPage() {
  useDocumentTitle('StockSense — Reset Password')
  const navigate = useNavigate()
  const { errors, setFieldError, clearFieldError, clearAllErrors } = useFieldErrors<ResetField>()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [alert, setAlert] = useState<ResetAlert | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdated, setIsUpdated] = useState(false)
  const [simulateExpired, setSimulateExpired] = useState(false)

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword && newPassword.length >= 8

  function fillDemoResetPassword() {
    setNewPassword('NewStockPass2026!')
    setConfirmPassword('NewStockPass2026!')
    clearAllErrors()
    setAlert(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!newPassword) {
      setFieldError('resetNewPassword', 'Password is required')
      return
    }
    if (newPassword.length < 8) {
      setFieldError('resetNewPassword', 'Password must be at least 8 characters')
      return
    }
    if (!confirmPassword) {
      setFieldError('resetConfirmPassword', 'Please confirm your password')
      return
    }
    if (newPassword !== confirmPassword) {
      setFieldError('resetConfirmPassword', 'Passwords do not match')
      return
    }

    setIsSubmitting(true)
    setAlert(null)

    setTimeout(() => {
      setIsSubmitting(false)

      if (simulateExpired) {
        setAlert({ message: 'Your password reset session has expired. Please request a new OTP.', isExpired: true })
        return
      }

      setIsUpdated(true)
    }, 850)
  }

  function resetPasswordComplete() {
    setIsUpdated(false)
    navigate(ROUTES.login)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04)] p-7 sm:p-9 transition-all relative" id="resetPasswordCard">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 mb-4 shadow-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <rect height="11" rx="2" ry="2" width="18" x="3" y="11" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <circle cx="12" cy="16" r="1" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1.5">Create a new password</h1>
        <p className="text-sm text-slate-500 font-normal leading-relaxed">Choose a new password for your StockSense account.</p>
      </div>

      {alert && (
        <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium flex items-start gap-2.5" id="resetAlert">
          <AlertCircleIcon />
          <div className="flex-1">
            <span id="resetAlertText">{alert.message}</span>{' '}
            {alert.isExpired && (
              <button className="underline font-semibold text-rose-700 hover:text-rose-800 ml-1" id="resetAlertLink" onClick={() => navigate(ROUTES.forgotPassword)} type="button">Start again</button>
            )}
          </div>
        </div>
      )}

      <form className="space-y-4" id="resetPasswordForm" noValidate onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="resetNewPassword">New password</label>
          <PasswordInput
            autoComplete="new-password"
            autoFocus
            hasError={!!errors.resetNewPassword}
            id="resetNewPassword"
            name="newPassword"
            onChange={(e) => {
              setNewPassword(e.target.value)
              clearFieldError('resetNewPassword')
            }}
            placeholder="Create a password"
            required
            value={newPassword}
          />
          <PasswordLengthHint iconId="resetCharLengthIcon" isMet={newPassword.length >= 8} textId="resetCharLengthText" />
          <FieldError id="resetNewPasswordError" message={errors.resetNewPassword} textId="resetNewPasswordErrorText" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="resetConfirmPassword">Confirm password</label>
          <PasswordInput
            autoComplete="new-password"
            hasError={!!errors.resetConfirmPassword}
            id="resetConfirmPassword"
            name="confirmPassword"
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              clearFieldError('resetConfirmPassword')
            }}
            placeholder="Re-enter your password"
            required
            value={confirmPassword}
          />
          {passwordsMatch && <PasswordMatchHint id="resetPasswordMatchSuccess" />}
          <FieldError id="resetConfirmPasswordError" message={errors.resetConfirmPassword} textId="resetConfirmPasswordErrorText" />
        </div>
        <div className="pt-2">
          <SubmitButton
            disabled={!passwordsMatch || isSubmitting}
            disabledOpacity="disabled:opacity-40"
            id="resetSubmitBtn"
            isLoading={isSubmitting}
            label="Update Password"
            loadingLabel="Updating password..."
            textId="resetSubmitBtnText"
          />
        </div>
      </form>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-1 cursor-pointer select-none text-slate-500">
            <input checked={simulateExpired} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-0" id="resetSimulateExpired" onChange={(e) => setSimulateExpired(e.target.checked)} type="checkbox" />
            <span>Simulate expired session</span>
          </label>
        </div>
        <button className="text-blue-600 hover:text-blue-700 font-medium underline-offset-2 hover:underline focus:outline-none" onClick={fillDemoResetPassword} type="button">Fill Valid Password</button>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 text-center">
        <button className="text-xs font-semibold text-slate-600 hover:text-blue-600 inline-flex items-center justify-center gap-1.5 mx-auto focus:outline-none transition-colors" onClick={() => navigate(ROUTES.login)} type="button">
          <ChevronLeftIcon />
          Back to Sign In
        </button>
      </div>

      {isUpdated && (
        <div className="absolute inset-0 bg-white rounded-2xl p-7 sm:p-9 flex flex-col items-center justify-center text-center z-10 animate-in fade-in duration-150" id="resetSuccessOverlay">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-sm border border-emerald-200/80">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1.5">Password updated</h2>
          <p className="text-sm text-slate-500 font-normal leading-relaxed mb-6 max-w-xs">Your password has been updated successfully. You can now use your new credentials to sign in.</p>
          <button className="w-full h-11 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" onClick={resetPasswordComplete} type="button">Continue to Sign In</button>
        </div>
      )}
    </div>
  )
}
