import { isIP } from 'node:net'

import { parseUserAgent, type ParsedUserAgent } from '../security/user-agent'

export type LinkFetchSite = 'same-origin' | 'same-site' | 'cross-site' | 'none'

export type SourceIpDeployment = 'vercel' | 'local'

/**
 * Request metadata is split into:
 * - in-memory security inputs (IP and network signals), which are hashed or
 *   reduced before persistence; and
 * - optional owner-facing context (coarse browser/location labels).
 */
export type LinkOpenMetadata = {
  referrerHost: string | null
  fetchSite: LinkFetchSite | null
  isPrefetch: boolean
  browser: ParsedUserAgent['browser']
  os: ParsedUserAgent['os']
  deviceType: ParsedUserAgent['deviceType'] | null
  country: string | null
  region?: string | null
  city?: string | null
  publicIp?: string | null
  vpnIndication?: boolean | null
  proxyIndication?: boolean | null
  torIndication?: boolean | null
  datacenterIndication?: boolean | null
  isProbableBot: boolean
}

const EMPTY_LINK_OPEN_METADATA: LinkOpenMetadata = {
  referrerHost: null,
  fetchSite: null,
  isPrefetch: false,
  browser: null,
  os: null,
  deviceType: null,
  country: null,
  region: null,
  city: null,
  publicIp: null,
  vpnIndication: null,
  proxyIndication: null,
  torIndication: null,
  datacenterIndication: null,
  isProbableBot: false,
}

const allowedFetchSites = new Set<LinkFetchSite>(['same-origin', 'same-site', 'cross-site', 'none'])

export function getLinkOpenMetadata(request: Pick<Request, 'headers' | 'url'>): LinkOpenMetadata {
  const userAgent = request.headers.get('user-agent')?.slice(0, 512) ?? null
  const parsedUserAgent = parseUserAgent(userAgent)
  return sanitizeLinkOpenMetadata({
    referrerHost: getReferrerHost(request.headers.get('referer')),
    fetchSite: getFetchSite(request.headers.get('sec-fetch-site')),
    isPrefetch: isPrefetchRequest(request.headers),
    ...parsedUserAgent,
    country: getCountry(request.headers),
    region: getHeaderValue(request.headers, ['x-vercel-ip-country-region', 'x-region']),
    city: getHeaderValue(request.headers, ['x-vercel-ip-city', 'x-city']),
    publicIp: getPublicIp(request.headers),
    vpnIndication: getBooleanHeader(request.headers, ['x-ip-vpn', 'x-vpn']),
    proxyIndication: getBooleanHeader(request.headers, ['x-ip-proxy', 'x-proxy']),
    torIndication: getBooleanHeader(request.headers, ['x-ip-tor', 'x-tor']),
    datacenterIndication: getBooleanHeader(request.headers, ['x-ip-datacenter', 'x-datacenter']),
  })
}

export function sanitizeLinkOpenMetadata(metadata?: Partial<LinkOpenMetadata>): LinkOpenMetadata {
  if (!metadata) return { ...EMPTY_LINK_OPEN_METADATA }

  return {
    referrerHost: sanitizeHost(metadata.referrerHost),
    fetchSite: getFetchSite(metadata.fetchSite),
    isPrefetch: metadata.isPrefetch === true,
    browser: getBrowser(metadata.browser),
    os: getOperatingSystem(metadata.os),
    deviceType: getDeviceType(metadata.deviceType),
    country: getCountryValue(metadata.country),
    region: sanitizeLocationLabel(metadata.region),
    city: sanitizeLocationLabel(metadata.city),
    publicIp: sanitizeIp(metadata.publicIp),
    vpnIndication: sanitizeBoolean(metadata.vpnIndication),
    proxyIndication: sanitizeBoolean(metadata.proxyIndication),
    torIndication: sanitizeBoolean(metadata.torIndication),
    datacenterIndication: sanitizeBoolean(metadata.datacenterIndication),
    isProbableBot: metadata.isProbableBot === true,
  }
}

export function toLinkOpenEventMetadata(metadata: LinkOpenMetadata, includeOptionalContext = true) {
  const values: Record<string, string | number | boolean> = {
    probable_bot: metadata.isProbableBot,
  }
  const optional: Array<[string, string | number | boolean | null | undefined]> = [
    ['referrer_host', metadata.referrerHost],
    ['fetch_site', metadata.fetchSite],
    ['prefetch', metadata.isPrefetch || null],
    ...(includeOptionalContext ? [
      ['browser', metadata.browser],
      ['os', metadata.os],
      ['device_type', metadata.deviceType],
      ['country', metadata.country],
      ['region', metadata.region],
      ['city', metadata.city],
    ] as Array<[string, string | number | boolean | null | undefined]> : []),
  ]
  for (const [key, value] of optional) if (value !== null && value !== undefined && value !== false) values[key] = value
  return values
}

function getReferrerHost(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? sanitizeHost(url.hostname) : null
  } catch {
    return null
  }
}

function isPrefetchRequest(headers: Headers) {
  return ['purpose', 'x-purpose', 'sec-purpose'].some((name) => headers.get(name)?.toLowerCase().includes('prefetch'))
}

function getFetchSite(value: string | null | undefined): LinkFetchSite | null {
  if (!value) return null
  const fetchSite = value.trim().toLowerCase()
  return allowedFetchSites.has(fetchSite as LinkFetchSite) ? fetchSite as LinkFetchSite : null
}

function sanitizeHost(value: string | null | undefined) {
  if (!value) return null
  const host = value.trim().toLowerCase()
  return host && host.length <= 255 && /^[a-z0-9.-]+$/.test(host) ? host : null
}

function sanitizeLocationLabel(value: string | null | undefined) {
  const normalized = value?.trim().replace(/[\u0000-\u001f\u007f]/g, ' ') ?? ''
  return normalized && normalized.length <= 64 ? normalized : null
}

function getBrowser(value: string | null | undefined): LinkOpenMetadata['browser'] {
  return value === 'Chrome' || value === 'Edge' || value === 'Firefox' || value === 'Safari' || value === 'Opera' || value === 'Brave' || value === 'Samsung Internet' ? value : null
}

function getOperatingSystem(value: string | null | undefined): LinkOpenMetadata['os'] {
  return value === 'Windows' || value === 'macOS' || value === 'iOS' || value === 'Android' || value === 'Linux' || value === 'ChromeOS' ? value : null
}

function getDeviceType(value: string | null | undefined): LinkOpenMetadata['deviceType'] {
  return value === 'mobile' || value === 'tablet' || value === 'desktop' ? value : null
}

function getCountry(headers: Headers) {
  return getCountryValue(getHeaderValue(headers, ['x-vercel-ip-country', 'cf-ipcountry']))
}

function getCountryValue(value: string | null | undefined) {
  if (!value) return null
  const country = value.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(country) && country !== 'XX' ? country : null
}

function getHeaderValue(headers: Headers, names: string[]) {
  for (const name of names) {
    const value = headers.get(name)?.trim()
    if (value) return value.slice(0, 64)
  }
  return null
}

function getBooleanHeader(headers: Headers, names: string[]) {
  const value = getHeaderValue(headers, names)?.toLowerCase()
  return value === 'true' || value === '1' ? true : value === 'false' || value === '0' ? false : null
}

function getPublicIp(headers: Headers) {
  return getTrustedSourceIp(headers)
}

/**
 * Resolve the source IP from the deployment boundary, not from arbitrary
 * forwarding headers supplied by a client. Direct Vercel traffic includes
 * `x-vercel-forwarded-for`, which Vercel normalizes to the public client IP.
 * Local development intentionally uses one shared bucket unless a developer
 * explicitly opts into a trusted local proxy with REPOVIEW_TRUST_LOCAL_PROXY=1.
 */
export function getTrustedSourceIp(headers: Headers, deployment: SourceIpDeployment = getSourceIpDeployment()) {
  if (deployment === 'vercel') return parseSingleIp(headers.get('x-vercel-forwarded-for'))
  if (process.env.REPOVIEW_TRUST_LOCAL_PROXY === '1') return parseSingleIp(headers.get('x-forwarded-for'))
  return null
}

function getSourceIpDeployment(): SourceIpDeployment {
  return process.env.VERCEL === '1' ? 'vercel' : 'local'
}

function parseSingleIp(value: string | null) {
  const candidate = value?.split(',')[0]?.trim()
  return candidate && isIP(candidate) ? candidate : null
}

function sanitizeIp(value: string | null | undefined) {
  return value && isIP(value) ? value : null
}

function sanitizeBoolean(value: boolean | null | undefined) {
  return typeof value === 'boolean' ? value : null
}
