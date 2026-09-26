import { type SelectOption } from './receiptsData.ts'

interface FilterSelectProps {
  id: string
  wrapperClass: string
  icon: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}

export function FilterSelect({ id, wrapperClass, icon, value, options, onChange }: FilterSelectProps) {
  return (
    <div className={wrapperClass}>
      <select className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer font-medium" id={id} onChange={(e) => onChange(e.target.value)} value={value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="material-symbols-outlined pointer-events-none absolute right-2 top-2 text-slate-400 text-base">{icon}</span>
    </div>
  )
}
