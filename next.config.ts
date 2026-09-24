import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async headers() {
    const developmentScriptPolicy = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()' },
      { key: 'Content-Security-Policy', value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${developmentScriptPolicy}; connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://127.0.0.1:* ws://localhost:*; font-src 'self' data:` },
    ]
    const privateNoStore = [
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'Vary', value: 'Cookie' },
    ]

    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/s/:path*', headers: [...privateNoStore, { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] },
      { source: '/view/:path*', headers: [...privateNoStore, { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] },
      { source: '/api/assets/:path*', headers: privateNoStore },
      { source: '/api/view/:path*', headers: privateNoStore },
      { source: '/dashboard', headers: privateNoStore },
      { source: '/dashboard/:path*', headers: privateNoStore },
      { source: '/onboarding/:path*', headers: privateNoStore },
      { source: '/system-admin/:path*', headers: [...privateNoStore, { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] },
    ]
  },
}

export default nextConfig
