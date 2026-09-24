import { describe, expect, it } from 'vitest'

import nextConfig from '../next.config'

describe('private cache policy', () => {
  it('marks share, viewer, protected API, and dashboard routes private and uncached', async () => {
    const headers = await nextConfig.headers?.()
    const sources = new Map(headers?.map((entry) => [entry.source, entry.headers]))

    for (const source of ['/s/:path*', '/view/:path*', '/api/assets/:path*', '/api/view/:path*', '/dashboard', '/dashboard/:path*']) {
      expect(sources.get(source)).toEqual(expect.arrayContaining([
        { key: 'Cache-Control', value: 'private, no-store' },
        { key: 'Vary', value: 'Cookie' },
      ]))
    }
  })
})
