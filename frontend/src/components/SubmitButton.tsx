interface SubmitButtonProps {
  id: string
  textId: string
  label: string
  loadingLabel: string
  isLoading: boolean
  disabled?: boolean
  /** Sign Up / Sign In / Forgot use 60%; Verify OTP / Reset (disabled until valid) use 40% */
  disabledOpacity: 'disabled:opacity-60' | 'disabled:opacity-40'
  tabIndex?: number
}

// Primary blue form action with the inline loading spinner
export function SubmitButton({ id, textId, label, loadingLabel, isLoading, disabled = isLoading, disabledOpacity, tabIndex }: SubmitButtonProps) {
  return (
    <button
      className={`w-full h-11 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 ${disabledOpacity} disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
      disabled={disabled}
      id={id}
      tabIndex={tabIndex}
      type="submit"
    >
      <span id={textId}>{isLoading ? loadingLabel : label}</span>
      {isLoading && (
        <svg className="w-4 h-4 text-white animate-spin-custom" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" />
        </svg>
      )}
    </button>
  )
}
