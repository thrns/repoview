import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getLinkOpenMetadata,
  sanitizeLinkOpenMetadata,
  toLinkOpenEventMetadata,
} from '../lib/shares/link-open-metadata'

beforeEach(() => vi.stubEnv('REPOVIEW_TRUSTED_SOURCE_IP_MODE', 'unavailable'))
afterEach(() => vi.unstubAllEnvs())

describe('link-open metadata', () => {
  it('keeps only a referrer host and coarse fetch context', () => {
    vi.stubEnv('REPOVIEW_TRUSTED_SOURCE_IP_MODE', 'vercel')
    const request = new Request('https://repoview.test/s/token', {
      headers: {
        referer: 'https://example.com/recruiting/repo?candidate=secret',
        'sec-fetch-site': 'Cross-Site',
        purpose: 'prefetch',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
        'x-vercel-ip-country': 'ca',
        'x-vercel-forwarded-for': '203.0.113.42',
      },
    })

    const metadata = getLinkOpenMetadata(request)

    expect(metadata).toMatchObject({
      referrerHost: 'example.com',
      fetchSite: 'cross-site',
      isPrefetch: true,
      browser: 'Chrome',
      os: 'Windows',
      deviceType: 'desktop',
      country: 'CA',
      isProbableBot: false,
    })
    expect(metadata.publicIp).toBe('203.0.113.42')
    expect(toLinkOpenEventMetadata(metadata)).not.toHaveProperty('public_ip')
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

  it('ignores spoofed forwarding headers in default/untrusted mode', () => {
    const request = new Request('https://repoview.test/s/token', {
      headers: {
        'x-forwarded-for': '198.51.100.77',
        'x-real-ip': '198.51.100.88',
        'x-vercel-forwarded-for': '203.0.113.42',
      },
    })
    expect(getLinkOpenMetadata(request).publicIp).toBeNull()
  })

  it('parses the Vercel IP only in vercel mode', () => {
    const request = new Request('https://repoview.test/s/token', {
      headers: { 'x-vercel-forwarded-for': '203.0.113.42' },
    })
    expect(getLinkOpenMetadata(request).publicIp).toBeNull()
    vi.stubEnv('REPOVIEW_TRUSTED_SOURCE_IP_MODE', 'vercel')
    expect(getLinkOpenMetadata(request).publicIp).toBe('203.0.113.42')
  })

  it('parses X-Real-IP only in trusted-x-real-ip mode', () => {
    const request = new Request('https://repoview.test/s/token', {
      headers: { 'x-real-ip': '198.51.100.88', 'x-forwarded-for': '198.51.100.77' },
    })
    vi.stubEnv('REPOVIEW_TRUSTED_SOURCE_IP_MODE', 'trusted-x-forwarded-for')
    expect(getLinkOpenMetadata(request).publicIp).toBe('198.51.100.77')
    vi.stubEnv('REPOVIEW_TRUSTED_SOURCE_IP_MODE', 'trusted-x-real-ip')
    expect(getLinkOpenMetadata(request).publicIp).toBe('198.51.100.88')
  })

  it('parses X-Forwarded-For only in trusted-x-forwarded-for mode', () => {
    const request = new Request('https://repoview.test/s/token', {
      headers: { 'x-forwarded-for': '198.51.100.77, 203.0.113.2' },
    })
    vi.stubEnv('REPOVIEW_TRUSTED_SOURCE_IP_MODE', 'trusted-x-real-ip')
    expect(getLinkOpenMetadata(request).publicIp).toBeNull()
    vi.stubEnv('REPOVIEW_TRUSTED_SOURCE_IP_MODE', 'trusted-x-forwarded-for')
    expect(getLinkOpenMetadata(request).publicIp).toBe('198.51.100.77')
  })

  it('rejects malformed or partially malformed IP candidates', () => {
    vi.stubEnv('REPOVIEW_TRUSTED_SOURCE_IP_MODE', 'trusted-x-real-ip')
    expect(getLinkOpenMetadata(new Request('https://repoview.test/s/token', {
      headers: { 'x-real-ip': 'not-an-ip' },
    })).publicIp).toBeNull()
    vi.stubEnv('REPOVIEW_TRUSTED_SOURCE_IP_MODE', 'trusted-x-forwarded-for')
    expect(getLinkOpenMetadata(new Request('https://repoview.test/s/token', {
      headers: { 'x-forwarded-for': '198.51.100.77, not-an-ip' },
    })).publicIp).toBeNull()
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
    })).toMatchObject({
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
    }))).toMatchObject({
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
