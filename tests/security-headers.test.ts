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
    expect(values.has('Content-Security-Policy')).toBe(false)
  })

  it('uses no-referrer on secret-link and viewer routes', async () => {
    const headers = await nextConfig.headers?.()
    for (const source of ['/s/:path*', '/view/:path*']) {
      const values = new Map(headers?.find((entry) => entry.source === source)?.headers.map((entry) => [entry.key, entry.value]))
      expect(values.get('Referrer-Policy')).toBe('no-referrer')
    }
  })

  it('uses a request nonce for Next scripts on rendered pages', () => {
    const policy = createContentSecurityPolicy({ nonce: 'test-nonce', isDevelopment: false })
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("frame-ancestors 'none'")
    expect(getScriptPolicy(policy)).toBe("script-src 'self' 'nonce-test-nonce' 'strict-dynamic' 'wasm-unsafe-eval'")
    expect(getScriptPolicy(policy)).not.toContain("'unsafe-inline'")
    expect(getScriptPolicy(policy)).not.toContain("'unsafe-eval'")
  })
})

function getScriptPolicy(policy: string | undefined) {
  return policy?.split('; ').find((directive) => directive.startsWith('script-src')) ?? ''
}
