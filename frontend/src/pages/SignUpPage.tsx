import { useState, type FormEvent } from 'react'
import { signup } from '../api/auth.ts'
import { ApiError } from '../api/client.ts'
import { FieldError } from '../components/FieldError.tsx'
import { AlertCircleIcon, LogoMarkIcon } from '../components/icons.tsx'
import { PasswordInput } from '../components/PasswordInput.tsx'
import { PasswordLengthHint, PasswordMatchHint } from '../components/PasswordHints.tsx'
import { SubmitButton } from '../components/SubmitButton.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { useFieldErrors } from '../hooks/useFieldErrors.ts'
import { inputClassName } from '../lib/inputClassName.ts'
import { validateEmail } from '../lib/validation.ts'

type SignupField = 'signupName' | 'signupEmail' | 'signupPassword' | 'signupConfirmPassword'

export default function SignUpPage() {
  useDocumentTitle('StockSense — Create Account')
  const { errors, setFieldError, clearFieldError } = useFieldErrors<SignupField>()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword && password.length >= 8

  function validateFieldOnBlur(field: 'signupName' | 'signupEmail', value: string) {
    const val = value.trim()
    if (!val) {
      setFieldError(field, field === 'signupName' ? 'Full name is required' : 'Email address is required')
    } else if (field === 'signupEmail' && !validateEmail(val)) {
      setFieldError('signupEmail', 'Please enter a valid email address')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const nameVal = name.trim()
    const emailVal = email.trim()
    let hasError = false

    if (!nameVal) {
      setFieldError('signupName', 'Full name is required')
      hasError = true
    }

    if (!emailVal) {
      setFieldError('signupEmail', 'Email address is required')
      hasError = true
    } else if (!validateEmail(emailVal)) {
      setFieldError('signupEmail', 'Please enter a valid email address')
      hasError = true
    }

    if (!password) {
      setFieldError('signupPassword', 'Password is required')
      hasError = true
    } else if (password.length < 8) {
      setFieldError('signupPassword', 'Password must be at least 8 characters')
      hasError = true
    }

    if (!confirmPassword) {
      setFieldError('signupConfirmPassword', 'Please confirm your password')
      hasError = true
    } else if (confirmPassword !== password) {
      setFieldError('signupConfirmPassword', 'Passwords do not match')
      hasError = true
    }

    if (hasError) return

    setIsSubmitting(true)
    setAlertMessage(null)

    try {
      // Signs in too; GuestOnly then redirects to the Dashboard
      await signup({ fullName: nameVal, email: emailVal, password })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFieldError('signupEmail', err.message)
      } else {
        setAlertMessage(err instanceof ApiError ? err.message : 'Unable to create your account. Please try again.')
      }
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.04)] p-7 sm:p-9 transition-all" id="signupCard">
      {/* Header Branding & Purpose */}
      <div className="text-center mb-6">
        {/* Logo Mark Badge */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 mb-4 shadow-sm">
          <LogoMarkIcon />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
        <p className="text-sm text-slate-500 mt-1">Set up your StockSense account to get started</p>
      </div>

      {/* Global Alert Notification Area */}
      {alertMessage && (
        <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium flex items-start gap-2.5" id="signupAlert">
          <AlertCircleIcon />
          <span id="signupAlertText">{alertMessage}</span>
        </div>
      )}

      {/* Sign Up Form */}
      <form className="space-y-4" id="signupForm" noValidate onSubmit={handleSubmit}>
        {/* Full Name Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="signupName">
            Full name
          </label>
          <input
            autoComplete="name"
            autoFocus
            className={inputClassName(!!errors.signupName)}
            id="signupName"
            name="name"
            onBlur={(e) => validateFieldOnBlur('signupName', e.target.value)}
            onChange={(e) => {
              setName(e.target.value)
              clearFieldError('signupName')
            }}
            placeholder="Enter your full name"
            required
            type="text"
            value={name}
          />
          <FieldError id="signupNameError" message={errors.signupName} />
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="signupEmail">
            Email address
          </label>
          <input
            autoComplete="email"
            className={inputClassName(!!errors.signupEmail)}
            id="signupEmail"
            name="email"
            onBlur={(e) => validateFieldOnBlur('signupEmail', e.target.value)}
            onChange={(e) => {
              setEmail(e.target.value)
              clearFieldError('signupEmail')
            }}
            placeholder="you@company.com"
            required
            type="email"
            value={email}
          />
          <FieldError id="signupEmailError" message={errors.signupEmail} />
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="signupPassword">
            Password
          </label>
          <PasswordInput
            autoComplete="new-password"
            hasError={!!errors.signupPassword}
            id="signupPassword"
            name="password"
            onChange={(e) => {
              setPassword(e.target.value)
              clearFieldError('signupPassword')
            }}
            placeholder="Create a password"
            required
            value={password}
          />
          {/* Dynamic Password Requirement Checklist */}
          <PasswordLengthHint iconId="charLengthIcon" isMet={password.length >= 8} textId="charLengthText" />
          <FieldError id="signupPasswordError" message={errors.signupPassword} />
        </div>

        {/* Confirm Password Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="signupConfirmPassword">
            Confirm password
          </label>
          <PasswordInput
            autoComplete="new-password"
            hasError={!!errors.signupConfirmPassword}
            id="signupConfirmPassword"
            name="confirmPassword"
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              clearFieldError('signupConfirmPassword')
            }}
            placeholder="Re-enter your password"
            required
            value={confirmPassword}
          />
          {/* Match Indicator */}
          {passwordsMatch && <PasswordMatchHint id="passwordMatchSuccess" />}
          <FieldError id="signupConfirmPasswordError" message={errors.signupConfirmPassword} />
        </div>

        {/* Primary Submit Action Button */}
        <div className="pt-2">
          <SubmitButton
            disabledOpacity="disabled:opacity-60"
            id="signupSubmitBtn"
            isLoading={isSubmitting}
            label="Create account"
            loadingLabel="Creating account..."
            textId="signupSubmitBtnText"
          />
        </div>
      </form>
    </div>
  )
}
