// StockSense logo mark shown in the Sign Up / Sign In card badge
export function LogoMarkIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <rect height="8" rx="2" width="8" x="3" y="3" />
      <path d="m7 11 4.7 7.9a1 1 0 0 0 1.6 0L21 7" />
      <rect height="8" rx="2" width="8" x="13" y="13" />
    </svg>
  )
}

// Icon for the rose alert banners at the top of a card
export function AlertCircleIcon() {
  return (
    <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  )
}

export function ChevronLeftIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}
