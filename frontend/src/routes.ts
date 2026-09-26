export const ROUTES = {
  landing: '/',
  signup: '/signup',
  login: '/login',
  forgotPassword: '/forgot-password',
  verifyOtp: '/verify-otp',
  resetPassword: '/reset-password',
  dashboard: '/dashboard',
  products: '/products',
  productNew: '/products/new',
  receipts: '/receipts',
  receiptNew: '/receipts/new',
  deliveries: '/deliveries',
  transfers: '/transfers',
  adjustments: '/adjustments',
  moveHistory: '/move-history',
  warehouse: '/warehouse',
  profile: '/profile',
} as const

export const productDetailPath = (productId: string) => `/products/${productId}`
export const receiptPath = (receiptId: string) => `/receipts/${receiptId}`
