import { useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { requestPasswordReset, verifyOtp } from '../api/auth.ts'
import { ApiError } from '../api/client.ts'
import { AlertCircleIcon, ChevronLeftIcon } from '../components/icons.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { useAuthFlow } from '../context/authFlow.ts'
import { useCountdown } from '../hooks/useCountdown.ts'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { maskEmail } from '../lib/validation.ts'
import { ROUTES } from '../routes.ts'

const OTP_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 30
const OTP_EXPIRY_SECONDS = 299 // 4 mins 59s
const OTP_EXPIRED_MESSAGE = 'The verification code has expired. Please request a new code.'

const emptyOtp = () => Array<string>(OTP_LENGTH).fill('')

function formatExpiry(secondsLeft: number): string {
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  return `Expires in ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function VerifyOtpPage() {
  useDocumentTitle('StockSense — Verify OTP')
  const navigate = useNavigate()
  const { registeredEmail, setResetToken } = useAuthFlow()

  const [digits, setDigits] = useState(emptyOtp)
  const [otpAlert, setOtpAlert] = useState<string | null>(null)
  // Tracked apart from the alert: editing the digits resets the red borders
  const [digitsInvalid, setDigitsInvalid] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [resendNotice, setResendNotice] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Resend cooldown (30s) and code expiry (5 minutes)
  const resendCooldown = useCountdown(RESEND_COOLDOWN_SECONDS)
  const expiry = useCountdown(OTP_EXPIRY_SECONDS, () => showOtpAlert(OTP_EXPIRED_MESSAGE))

  const isComplete = digits.join('').length === OTP_LENGTH

  function showOtpAlert(message: string) {
    setOtpAlert(message)
    setDigitsInvalid(true)
    setIsShaking(true)
  }

  function hideOtpAlert() {
    setOtpAlert(null)
    setDigitsInvalid(false)
  }

  function focusDigit(index: number) {
    inputRefs.current[index]?.focus()
  }

  function setDigit(index: number, value: string) {
    setDigits((prev) => prev.map((digit, i) => (i === index ? value : digit)))
  }

  function clearOtpInputs() {
    setDigits(emptyOtp())
    setDigitsInvalid(false)
  }

  function handleDigitKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        focusDigit(index - 1)
        setDigit(index - 1, '')
      } else {
        setDigit(index, '')
      }
      hideOtpAlert()
    } else if (event.key === 'ArrowLeft' && index > 0) {
      focusDigit(index - 1)
    } else if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      focusDigit(index + 1)
    }
  }

  function handleDigitChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const val = event.target.value.replace(/[^0-9]/g, '')
    const digit = val ? val.charAt(val.length - 1) : ''
    setDigit(index, digit)

    if (digit && index < OTP_LENGTH - 1) {
      focusDigit(index + 1)
    }

    hideOtpAlert()
  }

  // Handle paste across all 6 inputs
  function handleDigitPaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const pastedDigits = event.clipboardData.getData('text').trim().replace(/\D/g, '').split('')

    if (pastedDigits.length > 0) {
      setDigits(Array.from({ length: OTP_LENGTH }, (_, i) => pastedDigits[i] ?? ''))
      focusDigit(Math.min(pastedDigits.length, OTP_LENGTH - 1))
      hideOtpAlert()
    }
  }

  // OTP submission -> navigates to Reset Password with the short-lived reset token
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isComplete || isVerifying) return

    setIsVerifying(true)
    hideOtpAlert()
    setResendNotice(null)

    try {
      const { resetToken } = await verifyOtp(registeredEmail, digits.join(''))
      setResetToken(resetToken)
      navigate(ROUTES.resetPassword)
    } catch (err) {
      showOtpAlert(err instanceof ApiError ? err.message : 'Unable to verify the OTP. Please try again.')
      setIsVerifying(false)
    }
  }

  async function handleResendOtp() {
    if (isResending) return
    setIsResending(true)

    try {
      await requestPasswordReset(registeredEmail)
      hideOtpAlert()
      setResendNotice('A new OTP has been dispatched to your email.')
      setTimeout(() => setResendNotice(null), 5000)
      clearOtpInputs()
      resendCooldown.restart()
      expiry.restart()
      focusDigit(0)
    } catch (err) {
      setOtpAlert(err instanceof ApiError ? err.message : 'Unable to send a new OTP. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  // Direct visit without requesting an OTP first
  if (!registeredEmail) return <Navigate replace to={ROUTES.forgotPassword} />

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04)] p-7 sm:p-9 transition-all" id="verifyOtpCard">
      {/* Header with Shield/Key Glyph Badge */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 mb-4 shadow-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1.5">Verify your email</h1>
        <p className="text-sm text-slate-500 font-normal">Enter the 6-digit code sent to your email address.</p>
        {/* Masked Email Display Pill */}
        <div className="mt-3.5 inline-flex flex-wrap items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs">
          <span className="text-slate-500 font-medium">Sent to:</span>
          <span className="font-mono font-semibold text-slate-800" id="otpMaskedEmailDisplay">{maskEmail(registeredEmail)}</span>
          <span className="text-slate-300">·</span>
          <button className="text-blue-600 hover:text-blue-700 font-semibold hover:underline focus:outline-none transition-colors" onClick={() => navigate(ROUTES.forgotPassword)} type="button">Change email</button>
        </div>
      </div>

      {/* Global Alert Error Area for OTP */}
      {otpAlert && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium flex items-start gap-2.5" id="otpAlert">
          <AlertCircleIcon />
          <span id="otpAlertText">{otpAlert}</span>
        </div>
      )}

      {/* Global Alert Success Area for OTP Resend */}
      {resendNotice && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-medium flex items-start gap-2.5" id="otpResendSuccess">
          <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span id="otpResendSuccessText">{resendNotice}</span>
        </div>
      )}

      {/* 6-Digit OTP Form */}
      <form id="otpForm" noValidate onSubmit={handleSubmit}>
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Security Passcode</label>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="font-mono text-slate-500" id="otpTimerDisplay">{expiry.secondsLeft > 0 ? formatExpiry(expiry.secondsLeft) : 'Expired'}</span>
            </div>
          </div>
          {/* 6 Individual OTP Input Boxes */}
          <div
            className={`flex justify-between items-center gap-2 sm:gap-2.5${isShaking ? ' animate-shake' : ''}`}
            id="otpInputsContainer"
            onAnimationEnd={(e) => e.target === e.currentTarget && setIsShaking(false)}
          >
            {digits.map((digit, index) => (
              <input
                autoComplete={index === 0 ? 'one-time-code' : undefined}
                autoFocus={index === 0}
                className={`otp-digit w-11 h-12 sm:w-14 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold rounded-xl border ${digitsInvalid ? 'border-rose-400' : 'border-slate-300'} text-slate-900 bg-white focus-ring transition-all${digitsInvalid ? ' focus-ring-error' : ''}`}
                data-index={index}
                inputMode="numeric"
                key={index}
                maxLength={1}
                onChange={(e) => handleDigitChange(index, e)}
                onKeyDown={(e) => handleDigitKeyDown(index, e)}
                onPaste={handleDigitPaste}
                pattern="[0-9]*"
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="text"
                value={digit}
              />
            ))}
          </div>
        </div>

        {/* Resend Mechanism Area */}
        <div className="mb-5 text-center text-xs">
          {resendCooldown.secondsLeft > 0 ? (
            <div className="text-slate-500" id="otpCooldownBox">
              Didn't receive the code?{' '}
              <span className="font-medium text-slate-600">Resend OTP in <span className="font-mono font-bold text-blue-600" id="resendCountdown">{resendCooldown.secondsLeft}s</span></span>
            </div>
          ) : (
            <div id="otpResendActiveBox">
              Didn't receive the code?{' '}
              <button className="font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2 focus:outline-none" disabled={isResending} id="resendOtpBtn" onClick={handleResendOtp} type="button">
                {isResending ? 'Sending new code...' : 'Resend OTP'}
              </button>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div>
          <SubmitButton
            disabled={!isComplete || isVerifying}
            disabledOpacity="disabled:opacity-40"
            id="otpSubmitBtn"
            isLoading={isVerifying}
            label="Verify OTP"
            loadingLabel="Verifying..."
            textId="otpSubmitBtnText"
          />
        </div>
      </form>

      {/* Bottom Return Link */}
      <div className="mt-5 pt-3 border-t border-slate-100 text-center">
        <button className="text-xs font-semibold text-slate-600 hover:text-blue-600 inline-flex items-center justify-center gap-1.5 mx-auto focus:outline-none transition-colors" onClick={() => navigate(ROUTES.login)} type="button">
          <ChevronLeftIcon />
          Back to Sign In
        </button>
      </div>
    </div>
  )
}
