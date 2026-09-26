import { api } from './client.ts'
import { clearSession, setSessionFromAuth, updateSessionUser } from './session.ts'
import type { AuthResponse, MessageResponse, UserProfile } from './types.ts'

/** Creates the account and signs in (the first account ever becomes the Inventory Manager) */
export async function signup(input: { fullName: string; email: string; password: string }) {
  const auth = await api<AuthResponse>('POST', '/auth/signup', { body: input, auth: false })
  setSessionFromAuth(auth, true)
  return auth.user
}

/** `remember` = keep me signed in on this device (otherwise until the tab closes) */
export async function login(input: { email: string; password: string }, remember = true) {
  const auth = await api<AuthResponse>('POST', '/auth/login', { body: input, auth: false })
  setSessionFromAuth(auth, remember)
  return auth.user
}

export async function logout() {
  try {
    await api<MessageResponse>('POST', '/auth/logout')
  } finally {
    clearSession()
  }
}

/** Always resolves with the same message whether or not the account exists */
export function requestPasswordReset(email: string) {
  return api<MessageResponse>('POST', '/auth/forgot-password', { body: { email }, auth: false })
}

/** Returns a short-lived token for resetPassword() */
export function verifyOtp(email: string, otp: string) {
  return api<{ resetToken: string }>('POST', '/auth/verify-otp', { body: { email, otp }, auth: false })
}

export function resetPassword(resetToken: string, newPassword: string) {
  return api<MessageResponse>('POST', '/auth/reset-password', { body: { resetToken, newPassword }, auth: false })
}

export async function fetchMe() {
  const user = await api<UserProfile>('GET', '/users/me')
  updateSessionUser(user)
  return user
}

export async function updateMe(input: { fullName?: string; phone?: string }) {
  const user = await api<UserProfile>('PATCH', '/users/me', { body: input })
  updateSessionUser(user)
  return user
}

export function changePassword(currentPassword: string, newPassword: string) {
  return api<MessageResponse>('PATCH', '/users/me/password', { body: { currentPassword, newPassword } })
}
