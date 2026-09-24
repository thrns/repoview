export type ParsedUserAgent = {
  browser: 'Chrome' | 'Edge' | 'Firefox' | 'Safari' | 'Opera' | 'Brave' | 'Samsung Internet' | null
  os: 'Windows' | 'macOS' | 'iOS' | 'Android' | 'Linux' | 'ChromeOS' | null
  deviceType: 'mobile' | 'tablet' | 'desktop'
  isProbableBot: boolean
}

const BOT_PATTERN = /bot|crawler|spider|slurp|bingpreview|headless|prerender|preview|scanner|\bscan\b|facebookexternalhit|linkedinbot|twitterbot|pinterest|whatsapp|discordbot|slackbot|curl|wget|python-requests|go-http-client|axios/i

export function parseUserAgent(value: string | null): ParsedUserAgent {
  const userAgent = value?.slice(0, 512) ?? ''
  const isMobile = /Mobile|Android.*(?:Mobile|Mobi)|iPhone|iPod/i.test(userAgent)
  const isTablet = /iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent)

  return {
    browser: getBrowser(userAgent),
    os: getOperatingSystem(userAgent),
    deviceType: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
    isProbableBot: userAgent.length > 0 && BOT_PATTERN.test(userAgent),
  }
}

function getBrowser(userAgent: string): ParsedUserAgent['browser'] {
  if (/SamsungBrowser\//i.test(userAgent)) return 'Samsung Internet'
  if (/Brave/i.test(userAgent)) return 'Brave'
  if (/Edg\//i.test(userAgent)) return 'Edge'
  if (/OPR\//i.test(userAgent)) return 'Opera'
  if (/Chrome\//i.test(userAgent) || /CriOS\//i.test(userAgent)) return 'Chrome'
  if (/Firefox\//i.test(userAgent) || /FxiOS\//i.test(userAgent)) return 'Firefox'
  if (/Safari\//i.test(userAgent) && !/Chrome|Chromium|CriOS|Android/i.test(userAgent)) return 'Safari'
  return null
}

function getOperatingSystem(userAgent: string): ParsedUserAgent['os'] {
  if (/CrOS/i.test(userAgent)) return 'ChromeOS'
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS'
  if (/Android/i.test(userAgent)) return 'Android'
  if (/Windows/i.test(userAgent)) return 'Windows'
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'macOS'
  if (/Linux/i.test(userAgent)) return 'Linux'
  return null
}
