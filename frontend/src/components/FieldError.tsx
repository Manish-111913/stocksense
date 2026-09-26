interface FieldErrorProps {
  id: string
  message?: string
  textId?: string
}

export function FieldError({ id, message, textId }: FieldErrorProps) {
  if (!message) return null

  return (
    <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1" id={id}>
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
      </svg>
      <span id={textId}>{message}</span>
    </p>
  )
}
