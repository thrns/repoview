import { describe, expect, it } from 'vitest'

import { parseUserAgent } from '../lib/security/user-agent'

describe('User-Agent metadata parser', () => {
  it('returns coarse browser, OS, and mobile metadata', () => {
    expect(parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1')).toEqual({
      browser: 'Safari',
      os: 'iOS',
      deviceType: 'mobile',
      isProbableBot: false,
    })
  })

  it('marks obvious scanners without retaining their raw identity', () => {
    expect(parseUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toEqual({
      browser: null,
      os: null,
      deviceType: 'desktop',
      isProbableBot: true,
    })
  })

  it('does not infer metadata from an absent User-Agent', () => {
    expect(parseUserAgent(null)).toEqual({
      browser: null,
      os: null,
      deviceType: 'desktop',
      isProbableBot: false,
    })
  })
})
