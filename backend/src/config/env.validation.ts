const REQUIRED = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_RESET_SECRET',
] as const;

// Fail fast on startup instead of on the first request that needs a missing value
export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (config.NODE_ENV === 'production' && !config.SMTP_HOST) {
    throw new Error('SMTP_HOST is required in production (password-reset OTP emails)');
  }
  return config;
}
