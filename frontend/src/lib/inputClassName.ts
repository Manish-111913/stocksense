// Text/password input styling; the error state swaps the border colour and focus ring
export function inputClassName(hasError: boolean, padding = 'px-3.5'): string {
  return `w-full h-11 ${padding} rounded-lg border ${hasError ? 'border-rose-400' : 'border-slate-300'} text-slate-900 placeholder:text-slate-400 text-sm ${hasError ? 'focus-ring-error' : 'focus-ring'} bg-white font-normal`
}
