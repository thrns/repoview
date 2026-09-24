import { isIP } from 'node:net'

import { parseUserAgent, type ParsedUserAgent } from '../security/user-agent'

export type LinkFetchSite = 'same-origin' | 'same-site' | 'cross-site' | 'none'

export type LinkOpenMetadata = {
  referrerHost: string | null
  referrerUrl?: string | null
  fetchSite: LinkFetchSite | null
  isPrefetch: boolean
  browser: ParsedUserAgent['browser']
  browserVersion?: string | null
  renderingEngine?: string | null
  os: ParsedUserAgent['os']
  osVersion?: string | null
  deviceType: ParsedUserAgent['deviceType'] | null
  country: string | null
  region?: string | null
  regionCode?: string | null
  city?: string | null
  postalArea?: string | null
  timezone?: string | null
  continent?: string | null
  approximateLatitude?: number | null
  approximateLongitude?: number | null
  publicIp?: string | null
  ipVersion?: number | null
  asn?: string | null
  asnOrganization?: string | null
  ispOrganization?: string | null
  networkClassification?: string | null
  vpnIndication?: boolean | null
  proxyIndication?: boolean | null
  torIndication?: boolean | null
  datacenterIndication?: boolean | null
  httpProtocol?: string | null
  userAgent?: string | null
  isProbableBot: boolean
}

const EMPTY_LINK_OPEN_METADATA: LinkOpenMetadata = {
  referrerHost: null,
  referrerUrl: null,
  fetchSite: null,
  isPrefetch: false,
  browser: null,
  browserVersion: null,
  renderingEngine: null,
  os: null,
  osVersion: null,
  deviceType: null,
  country: null,
  region: null,
  regionCode: null,
  city: null,
  postalArea: null,
  timezone: null,
  continent: null,
  approximateLatitude: null,
  approximateLongitude: null,
  publicIp: null,
  ipVersion: null,
  asn: null,
  asnOrganization: null,
  ispOrganization: null,
  networkClassification: null,
  vpnIndication: null,
  proxyIndication: null,
  torIndication: null,
  datacenterIndication: null,
  httpProtocol: null,
  userAgent: null,
  isProbableBot: false,
}

const allowedFetchSites = new Set<LinkFetchSite>(['same-origin', 'same-site', 'cross-site', 'none'])

export function getLinkOpenMetadata(request: Pick<Request, 'headers' | 'url'>): LinkOpenMetadata {
  const userAgent = request.headers.get('user-agent')?.slice(0, 512) ?? null
  const parsedUserAgent = parseUserAgent(userAgent)
  return sanitizeLinkOpenMetadata({
    referrerHost: getReferrerHost(request.headers.get('referer')),
    referrerUrl: getReferrerUrl(request.headers.get('referer')),
    fetchSite: getFetchSite(request.headers.get('sec-fetch-site')),
    isPrefetch: isPrefetchRequest(request.headers),
    ...parsedUserAgent,
    browserVersion: getBrowserVersion(userAgent),
    renderingEngine: getRenderingEngine(userAgent),
    osVersion: getOsVersion(userAgent),
    userAgent,
    country: getCountry(request.headers),
    region: getHeaderValue(request.headers, ['x-vercel-ip-country-region', 'x-region']),
    regionCode: getHeaderValue(request.headers, ['x-vercel-ip-country-region', 'x-region-code']),
    city: getHeaderValue(request.headers, ['x-vercel-ip-city', 'x-city']),
    postalArea: getHeaderValue(request.headers, ['x-vercel-ip-postal-code', 'x-postal-code']),
    timezone: getHeaderValue(request.headers, ['x-vercel-ip-timezone', 'x-timezone']),
    continent: getHeaderValue(request.headers, ['x-vercel-ip-continent', 'x-continent']),
    approximateLatitude: getNumberHeader(request.headers, ['x-vercel-ip-latitude', 'x-latitude']),
    approximateLongitude: getNumberHeader(request.headers, ['x-vercel-ip-longitude', 'x-longitude']),
    publicIp: getPublicIp(request.headers),
    asn: getHeaderValue(request.headers, ['x-vercel-ip-asn', 'x-asn']),
    asnOrganization: getHeaderValue(request.headers, ['x-vercel-ip-as-organization', 'x-asn-organization']),
    ispOrganization: getHeaderValue(request.headers, ['x-isp-organization']),
    networkClassification: getHeaderValue(request.headers, ['x-network-classification']),
    vpnIndication: getBooleanHeader(request.headers, ['x-ip-vpn', 'x-vpn']),
    proxyIndication: getBooleanHeader(request.headers, ['x-ip-proxy', 'x-proxy']),
    torIndication: getBooleanHeader(request.headers, ['x-ip-tor', 'x-tor']),
    datacenterIndication: getBooleanHeader(request.headers, ['x-ip-datacenter', 'x-datacenter']),
    httpProtocol: getHeaderValue(request.headers, ['x-forwarded-proto']) ?? getProtocol(request),
  })
}

export function sanitizeLinkOpenMetadata(metadata?: Partial<LinkOpenMetadata>): LinkOpenMetadata {
  if (!metadata) return withHiddenAnalyticsFields({
    referrerHost: null,
    fetchSite: null,
    isPrefetch: false,
    browser: null,
    os: null,
    deviceType: null,
    country: null,
    isProbableBot: false,
  }, EMPTY_LINK_OPEN_METADATA)

  const sanitized = {
    referrerHost: sanitizeHost(metadata.referrerHost),
    fetchSite: getFetchSite(metadata.fetchSite),
    isPrefetch: metadata.isPrefetch === true,
    browser: getBrowser(metadata.browser),
    os: getOperatingSystem(metadata.os),
    deviceType: getDeviceType(metadata.deviceType),
    country: getCountryValue(metadata.country),
    isProbableBot: metadata.isProbableBot === true,
  }
  return withHiddenAnalyticsFields({ ...sanitized }, {
    referrerUrl: sanitizeUrl(metadata.referrerUrl),
    browserVersion: sanitizeShort(metadata.browserVersion),
    renderingEngine: sanitizeShort(metadata.renderingEngine),
    osVersion: sanitizeShort(metadata.osVersion),
    region: sanitizeShort(metadata.region),
    regionCode: sanitizeShort(metadata.regionCode),
    city: sanitizeShort(metadata.city),
    postalArea: sanitizeShort(metadata.postalArea),
    timezone: sanitizeShort(metadata.timezone),
    continent: sanitizeShort(metadata.continent),
    approximateLatitude: sanitizeCoordinate(metadata.approximateLatitude, -90, 90),
    approximateLongitude: sanitizeCoordinate(metadata.approximateLongitude, -180, 180),
    publicIp: sanitizeIp(metadata.publicIp),
    ipVersion: metadata.publicIp && isIP(metadata.publicIp) ? isIP(metadata.publicIp) : null,
    asn: sanitizeShort(metadata.asn),
    asnOrganization: sanitizeShort(metadata.asnOrganization),
    ispOrganization: sanitizeShort(metadata.ispOrganization),
    networkClassification: sanitizeShort(metadata.networkClassification),
    vpnIndication: sanitizeBoolean(metadata.vpnIndication),
    proxyIndication: sanitizeBoolean(metadata.proxyIndication),
    torIndication: sanitizeBoolean(metadata.torIndication),
    datacenterIndication: sanitizeBoolean(metadata.datacenterIndication),
    httpProtocol: sanitizeProtocol(metadata.httpProtocol),
    userAgent: metadata.userAgent?.slice(0, 512) ?? null,
  })
}

function withHiddenAnalyticsFields<T extends Record<string, unknown>>(value: T, fields: Partial<LinkOpenMetadata> = {}) {
  for (const [key, field] of Object.entries(fields)) {
    Object.defineProperty(value, key, { configurable: true, enumerable: false, value: field })
  }
  return value as T & LinkOpenMetadata
}

export function toLinkOpenEventMetadata(metadata: LinkOpenMetadata, includeOptionalContext = true) {
  const values: Record<string, string | number | boolean> = {
    probable_bot: metadata.isProbableBot,
  }
  const optional: Array<[string, string | number | boolean | null | undefined]> = [
    ['referrer_host', metadata.referrerHost], ['fetch_site', metadata.fetchSite], ['prefetch', metadata.isPrefetch || null],
    ...(includeOptionalContext ? [
      ['browser', metadata.browser], ['os', metadata.os], ['device_type', metadata.deviceType], ['country', metadata.country],
    ] as Array<[string, string | number | boolean | null | undefined]> : []),
  ]
  for (const [key, value] of optional) if (value !== null && value !== undefined && value !== false) values[key] = value
  return values
}

function getReferrerHost(value: string | null) {
  const url = parseUrl(value)
  return url ? sanitizeHost(url.hostname) : null
}

function getReferrerUrl(value: string | null) {
  const url = parseUrl(value)
  if (!url) return null
  url.username = ''
  url.password = ''
  url.search = ''
  url.hash = ''
  return sanitizeUrl(url.toString())
}

function parseUrl(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

function sanitizeHost(value: string | null | undefined) {
  if (!value) return null
  const host = value.trim().toLowerCase()
  return host && host.length <= 255 && /^[a-z0-9.-]+$/.test(host) ? host : null
}

function sanitizeUrl(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.trim()
  return normalized.length <= 2048 && /^https?:\/\//i.test(normalized) ? normalized : null
}

function sanitizeShort(value: string | null | undefined) {
  const normalized = value?.trim().replace(/[\u0000-\u001f\u007f]/g, ' ') ?? ''
  return normalized && normalized.length <= 255 ? normalized : null
}

function getFetchSite(value: string | null | undefined): LinkFetchSite | null {
  if (!value) return null
  const fetchSite = value.trim().toLowerCase()
  return allowedFetchSites.has(fetchSite as LinkFetchSite) ? fetchSite as LinkFetchSite : null
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
    if (value) return value.slice(0, 255)
  }
  return null
}

function getNumberHeader(headers: Headers, names: string[]) {
  const value = getHeaderValue(headers, names)
  const number = value ? Number(value) : NaN
  return Number.isFinite(number) ? number : null
}

function getBooleanHeader(headers: Headers, names: string[]) {
  const value = getHeaderValue(headers, names)?.toLowerCase()
  return value === 'true' || value === '1' ? true : value === 'false' || value === '0' ? false : null
}

function getPublicIp(headers: Headers) {
  const values = [headers.get('x-vercel-forwarded-for'), headers.get('x-forwarded-for'), headers.get('x-real-ip')]
  for (const value of values) {
    const candidate = value?.split(',')[0]?.trim()
    if (candidate && isIP(candidate)) return candidate
  }
  return null
}

function getBrowserVersion(userAgent: string | null) {
  return getUaVersion(userAgent, /(?:Edg|OPR|Chrome|CriOS|Firefox|FxiOS|Version|SamsungBrowser|Brave)\/([\d.]+)/i)
}

function getOsVersion(userAgent: string | null) {
  return getUaVersion(userAgent, /(?:Windows NT|Android|Mac OS X|CPU (?:iPhone )?OS)\s?([\d_\.]+)/i)?.replaceAll('_', '.') ?? null
}

function getUaVersion(userAgent: string | null, pattern: RegExp) {
  return userAgent?.match(pattern)?.[1]?.slice(0, 64) ?? null
}

function getRenderingEngine(userAgent: string | null) {
  if (!userAgent) return null
  if (/Gecko\//i.test(userAgent) && /Firefox\//i.test(userAgent)) return 'Gecko'
  if (/AppleWebKit\//i.test(userAgent)) return 'WebKit/Blink'
  if (/Trident\//i.test(userAgent)) return 'Trident'
  return null
}

function getProtocol(request: Pick<Request, 'url'>) {
  try { return new URL(request.url).protocol.replace(':', '') } catch { return null }
}

function sanitizeIp(value: string | null | undefined) {
  return value && isIP(value) ? value : null
}

function sanitizeCoordinate(value: number | null | undefined, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null
}

function sanitizeBoolean(value: boolean | null | undefined) {
  return typeof value === 'boolean' ? value : null
}

function sanitizeProtocol(value: string | null | undefined) {
  return value === 'http' || value === 'https' || value === 'h2' || value === 'h3' ? value : null
}

function isPrefetchRequest(headers: Headers) {
  const purpose = headers.get('purpose')?.trim().toLowerCase()
  const xPurpose = headers.get('x-purpose')?.trim().toLowerCase()
  return purpose === 'prefetch' || xPurpose === 'prefetch'
}
