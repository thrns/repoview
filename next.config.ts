import type { NextConfig } from 'next'

import { createContentSecurityPolicy } from './lib/security/csp'

const nextConfig: NextConfig = {
  experimental: { globalNotFound: true },
  poweredByHeader: false,
  trailingSlash: false,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async headers() {
    const contentSecurityPolicy = createContentSecurityPolicy({ isDevelopment: process.env.NODE_ENV === 'development' })
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()' },
      { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    ]
    const privateNoStore = [
      { key: 'Cache-Control', value: 'private, no-store' },
      { key: 'Vary', value: 'Cookie' },
    ]
    const noIndex = { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }

    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/', headers: privateNoStore },
      { source: '/s/:path*', headers: [...privateNoStore, { key: 'Referrer-Policy', value: 'no-referrer' }, noIndex] },
      { source: '/view/:path*', headers: [...privateNoStore, { key: 'Referrer-Policy', value: 'no-referrer' }, noIndex] },
      { source: '/api/assets/:path*', headers: privateNoStore },
      { source: '/api/view/:path*', headers: privateNoStore },
      { source: '/dashboard', headers: [...privateNoStore, noIndex] },
      { source: '/dashboard/:path*', headers: [...privateNoStore, noIndex] },
      { source: '/onboarding/:path*', headers: [...privateNoStore, noIndex] },
      { source: '/system-admin/:path*', headers: [...privateNoStore, noIndex] },
      { source: '/workspace/:path*', headers: [...privateNoStore, noIndex] },
      { source: '/login', headers: [noIndex] },
      { source: '/signup', headers: [noIndex] },
      { source: '/auth/callback/:path*', headers: [noIndex] },
      { source: '/api/:path*', headers: [noIndex] },
    ]
  },
}

export default nextConfig
