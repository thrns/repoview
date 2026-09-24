import { describe, expect, it } from 'vitest'

import robots from '../app/robots'
import nextConfig from '../next.config'

describe('private route indexing protections', () => {
  it('disallows private namespaces in robots metadata without treating it as authorization', () => {
    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: ['/s/', '/view/', '/dashboard/', '/system-admin'] } })
  })

  it('marks secret-link and viewer responses noindex', async () => {
    const headers = await nextConfig.headers?.()
    for (const source of ['/s/:path*', '/view/:path*']) {
      const value = headers?.find((entry) => entry.source === source)?.headers.find((header) => header.key === 'X-Robots-Tag')?.value
      expect(value).toBe('noindex, nofollow, noarchive')
    }
  })

  it('keeps the internal operator surface out of search results', async () => {
    const headers = await nextConfig.headers?.()
    const values = new Map(headers?.find((entry) => entry.source === '/system-admin/:path*')?.headers.map((entry) => [entry.key, entry.value]))
    expect(values.get('Cache-Control')).toBe('private, no-store')
    expect(values.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive')
  })
})
