import type { NextConfig } from 'next'

import { createContentSecurityPolicy } from './lib/security/csp'

const nextConfig: NextConfig = {
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
