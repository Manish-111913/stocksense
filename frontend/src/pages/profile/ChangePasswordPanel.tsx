import { type FormEvent, useState } from 'react'
import { changePassword } from '../../api/auth.ts'
import { ApiError } from '../../api/client.ts'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './data.ts'

// Change-password accordion: same strength rule as Sign Up (8+ characters), checked again by the backend
const RULE_MET = 'flex items-center space-x-1.5 text-emerald-600 font-medium'
const RULE_UNMET = 'flex items-center space-x-1.5 text-slate-400'
const DOT_MET = 'w-1.5 h-1.5 rounded-full bg-emerald-500'
const DOT_UNMET = 'w-1.5 h-1.5 rounded-full bg-slate-300'
const PANEL = 'p-4 rounded-xl bg-white border border-slate-200 text-xs'
const INPUT = 'w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition-all'

type FieldId = 'currentPassword' | 'newPassword' | 'confirmPassword'

const FIELDS: { id: FieldId; label: string; autoComplete: string }[] = [
  { id: 'currentPassword', label: 'Current Password', autoComplete: 'current-password' },
  { id: 'newPassword', label: 'New Password', autoComplete: 'new-password' },
  { id: 'confirmPassword', label: 'Confirm New Password', autoComplete: 'new-password' },
]

const EMPTY_VALUES: Record<FieldId, string> = { currentPassword: '', newPassword: '', confirmPassword: '' }
const HIDDEN_VALUES: Record<FieldId, boolean> = { currentPassword: false, newPassword: false, confirmPassword: false }

const hasLength = (value: string) => value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH

type ChangePasswordPanelProps = {
  isOpen: boolean
  onClose: () => void
  onChanged: () => void
}

export function ChangePasswordPanel({ isOpen, onClose, onChanged }: ChangePasswordPanelProps) {
  const [values, setValues] = useState(EMPTY_VALUES)
  const [visible, setVisible] = useState(HIDDEN_VALUES)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const next = values.newPassword
  const rules = [
    { id: 'ruleLength', label: 'At least 8 characters', met: hasLength(next) },
    { id: 'ruleDifferent', label: 'Different from current password', met: next.length > 0 && next !== values.currentPassword },
    { id: 'ruleMatch', label: 'Confirmation matches', met: next.length > 0 && next === values.confirmPassword },
  ]

  function reset() {
    setValues(EMPTY_VALUES)
    setVisible(HIDDEN_VALUES)
    setError('')
  }

  function handleCancel() {
    if (isSubmitting) return
    reset()
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    if (!values.currentPassword) {
      setError('Please enter your current password.')
      return
    }
    if (next.length < PASSWORD_MIN_LENGTH) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (next.length > PASSWORD_MAX_LENGTH) {
      setError(`Password must be at most ${PASSWORD_MAX_LENGTH} characters.`)
      return
    }
    if (next === values.currentPassword) {
      setError('New password must be different from the current password.')
      return
    }
    if (next !== values.confirmPassword) {
      setError('The new password and confirmation password do not match.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      await changePassword(values.currentPassword, next)
      reset()
      onClose()
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change your password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={isOpen ? PANEL : `hidden ${PANEL}`} id="changePasswordAccordion">
      <form className="space-y-3" id="passwordForm" noValidate onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FIELDS.map((field) => (
            <div className="flex flex-col gap-1" key={field.id}>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider" htmlFor={field.id}>{field.label}</label>
              <div className="relative">
                <input
                  autoComplete={field.autoComplete}
                  className={INPUT}
                  id={field.id}
                  disabled={isSubmitting}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                    setError('')
                  }}
                  placeholder="••••••••"
                  type={visible[field.id] ? 'text' : 'password'}
                  value={values[field.id]}
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors" onClick={() => setVisible((prev) => ({ ...prev, [field.id]: !prev[field.id] }))} title="Toggle Visibility" type="button">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        <ul className="flex flex-wrap items-center gap-4 text-[11px]">
          {rules.map((rule) => (
            <li className={rule.met ? RULE_MET : RULE_UNMET} id={rule.id} key={rule.id}>
              <span className={rule.met ? DOT_MET : DOT_UNMET} />
              <span>{rule.label}</span>
            </li>
          ))}
        </ul>
        <p className={error ? 'text-rose-600 font-medium' : 'hidden text-rose-600 font-medium'} id="passwordError">{error}</p>
        <div className="flex items-center justify-end gap-2">
          <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-colors" disabled={isSubmitting} id="cancelPasswordBtn" onClick={handleCancel} type="button">
            Cancel
          </button>
          <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors disabled:opacity-60" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  )
}
