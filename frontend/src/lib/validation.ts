export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Mask email address (e.g. y•••••@company.com)
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'm•••••@example.com'
  const [local, domain] = email.split('@')
  if (local.length <= 1) {
    return `${local}•••••@${domain}`
  }
  return `${local.charAt(0)}${'•'.repeat(Math.max(4, local.length - 1))}@${domain}`
}
