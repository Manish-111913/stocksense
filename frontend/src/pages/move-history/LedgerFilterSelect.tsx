import type { ReactNode } from 'react'
import type { SelectOption } from './data.ts'

interface LedgerFilterSelectProps {
  id: string
  label: ReactNode
  icon?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

// Keeps the original pill-button look; a transparent native <select> on top does the picking
export function LedgerFilterSelect({ id, label, icon, options, value, onChange, disabled }: LedgerFilterSelectProps) {
  return (
    <div className={disabled ? 'relative opacity-60' : 'relative'}>
      <span className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5">
        {icon && <span className="material-symbols-outlined text-[15px] text-slate-400">{icon}</span>}
        <span>{label}</span>
        <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
      </span>
      <select aria-label={typeof label === 'string' ? label : id} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed text-xs" disabled={disabled} id={id} onChange={(e) => onChange(e.target.value)} value={value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
