interface PasswordLengthHintProps {
  iconId: string
  textId: string
  isMet: boolean
}

// Dynamic "At least 8 characters" requirement checklist
export function PasswordLengthHint({ iconId, textId, isMet }: PasswordLengthHintProps) {
  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs">
      <span
        className={isMet ? 'inline-flex items-center text-emerald-600 font-bold text-xs' : 'inline-flex items-center text-slate-400 font-mono text-[13px] leading-none'}
        id={iconId}
      >
        {isMet ? '✓' : '○'}
      </span>
      <span className={isMet ? 'text-emerald-600 font-medium' : 'text-slate-400'} id={textId}>At least 8 characters</span>
    </div>
  )
}

export function PasswordMatchHint({ id }: { id: string }) {
  return (
    <p className="mt-1 text-xs text-emerald-600 font-medium flex items-center gap-1" id={id}>
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>Passwords match</span>
    </p>
  )
}
