import { describe, expect, it } from 'vitest'

import {
  getLinkOpenMetadata,
  sanitizeLinkOpenMetadata,
  toLinkOpenEventMetadata,
} from '../lib/shares/link-open-metadata'

describe('link-open metadata', () => {
  it('keeps only a referrer host and coarse fetch context', () => {
    const request = new Request('https://repoview.test/s/token', {
      headers: {
        referer: 'https://example.com/recruiting/repo?candidate=secret',
        'sec-fetch-site': 'Cross-Site',
        purpose: 'prefetch',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
        'x-vercel-ip-country': 'ca',
      },
    })

    const metadata = getLinkOpenMetadata(request)

    expect(metadata).toEqual({
      referrerHost: 'example.com',
      fetchSite: 'cross-site',
      isPrefetch: true,
      browser: 'Chrome',
      os: 'Windows',
      deviceType: 'desktop',
      country: 'CA',
      isProbableBot: false,
    })
    expect(toLinkOpenEventMetadata(metadata)).toEqual({
      referrer_host: 'example.com',
      fetch_site: 'cross-site',
      prefetch: true,
      browser: 'Chrome',
      os: 'Windows',
      device_type: 'desktop',
      country: 'CA',
      probable_bot: false,
    })
  })

  it('rejects unsafe or unknown metadata values', () => {
    expect(sanitizeLinkOpenMetadata({
      referrerHost: 'javascript:alert(1)',
      fetchSite: 'unknown' as never,
      isPrefetch: false,
      browser: 'Not a browser' as never,
      os: 'Not an OS' as never,
      deviceType: 'unknown' as never,
      country: 'Canada' as never,
      isProbableBot: false,
    })).toEqual({
      referrerHost: null,
      fetchSite: null,
      isPrefetch: false,
      browser: null,
      os: null,
      deviceType: null,
      country: null,
      isProbableBot: false,
    })

    expect(getLinkOpenMetadata(new Request('https://repoview.test/s/token', {
      headers: {
        referer: 'javascript:alert(1)',
        'sec-fetch-site': 'private-network',
        'x-purpose': 'prefetch',
        'x-vercel-ip-country': 'XX',
        'cf-ipcountry': 'Canada',
      },
    }))).toEqual({
      referrerHost: null,
      fetchSite: null,
      isPrefetch: true,
      browser: null,
      os: null,
      deviceType: 'desktop',
      country: null,
      isProbableBot: false,
    })
  })
})
