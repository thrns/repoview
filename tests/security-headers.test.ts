import { describe, expect, it } from 'vitest'

import { createContentSecurityPolicy } from '../lib/security/csp'
import nextConfig from '../next.config'

describe('security headers', () => {
  it('sets a baseline that blocks framing, plugins, unnecessary capabilities, and unsafe external content', async () => {
    const headers = await nextConfig.headers?.()
    const globalHeaders = headers?.find((entry) => entry.source === '/:path*')?.headers
    const values = new Map(globalHeaders?.map((entry) => [entry.key, entry.value]))

    expect(values.get('X-Content-Type-Options')).toBe('nosniff')
    expect(values.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(values.get('X-Frame-Options')).toBe('DENY')
    expect(values.get('Permissions-Policy')).toContain('camera=()')
    expect(values.get('Content-Security-Policy')).toContain("object-src 'none'")
    expect(values.get('Content-Security-Policy')).toContain("frame-ancestors 'none'")
  })

  it('uses no-referrer on secret-link and viewer routes', async () => {
    const headers = await nextConfig.headers?.()
    for (const source of ['/s/:path*', '/view/:path*']) {
      const values = new Map(headers?.find((entry) => entry.source === source)?.headers.map((entry) => [entry.key, entry.value]))
      expect(values.get('Referrer-Policy')).toBe('no-referrer')
    }
  })

  it('allows eval-backed React debugging only in development', async () => {
    const environment = process.env as Record<string, string | undefined>
    const originalNodeEnv = environment.NODE_ENV

    try {
      environment.NODE_ENV = 'development'
      const developmentHeaders = await nextConfig.headers?.()
      const developmentCsp = developmentHeaders?.find((entry) => entry.source === '/:path*')?.headers.find((entry) => entry.key === 'Content-Security-Policy')?.value
      expect(developmentCsp).toContain("script-src 'self' 'unsafe-eval'")
      expect(getScriptPolicy(developmentCsp)).not.toContain("'unsafe-inline'")

      environment.NODE_ENV = 'production'
      const productionHeaders = await nextConfig.headers?.()
      const productionCsp = productionHeaders?.find((entry) => entry.source === '/:path*')?.headers.find((entry) => entry.key === 'Content-Security-Policy')?.value
      expect(getScriptPolicy(productionCsp)).toBe("script-src 'self'")
      expect(getScriptPolicy(productionCsp)).not.toContain("'unsafe-inline'")
    } finally {
      environment.NODE_ENV = originalNodeEnv
    }
  })

  it('uses a request nonce for Next scripts on rendered pages', () => {
    const policy = createContentSecurityPolicy({ nonce: 'test-nonce', isDevelopment: false })
    expect(getScriptPolicy(policy)).toBe("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'")
    expect(getScriptPolicy(policy)).not.toContain("'unsafe-inline'")
  })
})

function getScriptPolicy(policy: string | undefined) {
  return policy?.split('; ').find((directive) => directive.startsWith('script-src')) ?? ''
}
