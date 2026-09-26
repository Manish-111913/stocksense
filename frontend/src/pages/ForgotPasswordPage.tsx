import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { requestPasswordReset } from '../api/auth.ts'
import { ApiError } from '../api/client.ts'
import { FieldError } from '../components/FieldError.tsx'
import { ChevronLeftIcon } from '../components/icons.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { useAuthFlow } from '../context/authFlow.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { useFieldErrors } from '../hooks/useFieldErrors.ts'
import { inputClassName } from '../lib/inputClassName.ts'
import { validateEmail } from '../lib/validation.ts'
import { ROUTES } from '../routes.ts'

export default function ForgotPasswordPage() {
  useDocumentTitle('StockSense — Forgot Password')
  const navigate = useNavigate()
  const { registeredEmail, setRegisteredEmail, setResetToken } = useAuthFlow()
  const { errors, setFieldError, clearFieldError } = useFieldErrors<'forgotEmail'>()

  // Prefilled when coming back from Verify OTP via "Change email"
  const [email, setEmail] = useState(registeredEmail)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Forgot password submit -> transitions to Verify OTP with the masked email
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    const emailVal = email.trim().toLowerCase()

    if (!emailVal || !validateEmail(emailVal)) {
      setFieldError('forgotEmail', 'Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      const { expiresInSeconds, resendCooldownSeconds } = await requestPasswordReset(emailVal)
      setRegisteredEmail(emailVal)
      setResetToken(null)
      navigate(ROUTES.verifyOtp, { state: { expiresInSeconds, resendCooldownSeconds } })
    } catch (err) {
      setFieldError('forgotEmail', err instanceof ApiError ? err.message : 'Unable to send the OTP. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04)] p-7 sm:p-9 transition-all" id="forgotCard">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 mb-4 shadow-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <rect height="11" rx="2" ry="2" width="18" x="3" y="11" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1.5">Forgot your password?</h1>
        <p className="text-sm text-slate-500 font-normal leading-relaxed">Enter the email address associated with your StockSense account and we'll send you an OTP to reset your password.</p>
      </div>

      {/* OTP dispatched notice: present but never shown in the original design, kept for parity */}
      <div className="hidden mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150" id="forgotOtpSuccessBox">
        <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
        <div className="flex-1 leading-relaxed">
          <span className="font-semibold block text-emerald-900 mb-0.5">OTP Dispatched</span>
          <span id="forgotSuccessDetail">A 6-digit one-time passcode has been sent to your email. Please check your inbox.</span>
        </div>
      </div>

      <form className="space-y-4" id="forgotForm" noValidate onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="forgotEmail">Email address</label>
          <input
            autoComplete="email"
            autoFocus
            className={inputClassName(!!errors.forgotEmail)}
            id="forgotEmail"
            name="email"
            onChange={(e) => {
              setEmail(e.target.value)
              clearFieldError('forgotEmail')
            }}
            placeholder="you@company.com"
            required
            type="email"
            value={email}
          />
          <FieldError id="forgotEmailError" message={errors.forgotEmail} textId="forgotEmailErrorText" />
        </div>
        <div className="pt-2">
          <SubmitButton
            disabledOpacity="disabled:opacity-60"
            id="forgotSubmitBtn"
            isLoading={isSubmitting}
            label="Send OTP"
            loadingLabel="Sending OTP..."
            textId="forgotSubmitBtnText"
          />
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center justify-center gap-1.5 mx-auto focus:outline-none hover:underline" onClick={() => navigate(ROUTES.login)} type="button">
          <ChevronLeftIcon />
          Back to Sign In
        </button>
      </div>
    </div>
  )
}
