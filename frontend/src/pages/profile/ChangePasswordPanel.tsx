import { type FormEvent, useState } from 'react'

// The original markup has no password form; this accordion is rebuilt from the script's ids, rules and class strings
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

const hasLength = (value: string) => value.length >= 8
const hasUpper = (value: string) => /[A-Z]/.test(value)
const hasNumber = (value: string) => /[0-9!@#$%^&*]/.test(value)

type ChangePasswordPanelProps = {
  isOpen: boolean
  onClose: () => void
  onChanged: () => void
}

export function ChangePasswordPanel({ isOpen, onClose, onChanged }: ChangePasswordPanelProps) {
  const [values, setValues] = useState(EMPTY_VALUES)
  const [visible, setVisible] = useState(HIDDEN_VALUES)
  const [error, setError] = useState('')

  const next = values.newPassword
  const rules = [
    { id: 'ruleLength', label: 'At least 8 characters', met: hasLength(next) },
    { id: 'ruleUpper', label: 'One uppercase letter', met: hasUpper(next) },
    { id: 'ruleNumber', label: 'One number or symbol', met: hasNumber(next) },
  ]

  function reset() {
    setValues(EMPTY_VALUES)
    setVisible(HIDDEN_VALUES)
    setError('')
  }

  function handleCancel() {
    reset()
    onClose()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasLength(next) || !hasUpper(next) || !hasNumber(next)) {
      setError('Please meet all password requirements before proceeding.')
      return
    }
    if (next !== values.confirmPassword) {
      setError('The new password and confirmation password do not match.')
      return
    }
    reset()
    onClose()
    onChanged()
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
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
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
          <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-colors" id="cancelPasswordBtn" onClick={handleCancel} type="button">
            Cancel
          </button>
          <button className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors" type="submit">
            Update Password
          </button>
        </div>
      </form>
    </div>
  )
}
