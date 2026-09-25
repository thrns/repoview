export function createContentSecurityPolicy({ nonce, isDevelopment = false }: { nonce?: string; isDevelopment?: boolean } = {}) {
  const scriptSources = [
    "'self'",
    ...(nonce ? [`'nonce-${nonce}'`, "'strict-dynamic'"] : []),
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ].join(' ')

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSources}`,
    'connect-src \'self\' https://*.supabase.co wss://*.supabase.co ws://127.0.0.1:* ws://localhost:*',
    "font-src 'self' data:",
  ].join('; ')
}
