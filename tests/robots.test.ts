import { describe, expect, it } from 'vitest'

import robots from '../app/robots'
import nextConfig from '../next.config'

describe('private route indexing protections', () => {
  it('disallows private namespaces in robots metadata without treating it as authorization', () => {
    expect(robots()).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: ['/s/', '/view/', '/dashboard', '/system-admin', '/onboarding', '/workspace', '/login', '/signup', '/auth/callback', '/api/'],
      },
      sitemap: 'https://repoview.thrn.im/sitemap.xml',
    })
  })

  it('preserves noindex, nofollow, noarchive and no-referrer on source-sharing and viewer routes', async () => {
    const headers = await nextConfig.headers?.()
    for (const source of ['/s/:path*', '/view/:path*']) {
      const values = new Map(headers?.find((entry) => entry.source === source)?.headers.map((header) => [header.key, header.value]))
      expect(values.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive')
      expect(values.get('Referrer-Policy')).toBe('no-referrer')
    }
  })

  it.each([
    '/dashboard',
    '/dashboard/:path*',
    '/system-admin/:path*',
    '/onboarding/:path*',
    '/workspace/:path*',
    '/login',
    '/signup',
    '/auth/callback/:path*',
    '/api/:path*',
  ])('marks the internal route %s noindex', async (source) => {
    const headers = await nextConfig.headers?.()
    const value = headers?.find((entry) => entry.source === source)?.headers.find((header) => header.key === 'X-Robots-Tag')?.value
    expect(value).toBe('noindex, nofollow, noarchive')
  })

  it('keeps dashboard and operator responses private and uncached', async () => {
    const headers = await nextConfig.headers?.()
    for (const source of ['/dashboard', '/dashboard/:path*', '/system-admin/:path*']) {
      const values = new Map(headers?.find((entry) => entry.source === source)?.headers.map((header) => [header.key, header.value]))
      expect(values.get('Cache-Control')).toBe('private, no-store')
      expect(values.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive')
    }
  })

  it('disables the powered-by header and keeps slashless canonical paths', () => {
    expect(nextConfig.poweredByHeader).toBe(false)
    expect(nextConfig.trailingSlash).toBe(false)
  })
})
