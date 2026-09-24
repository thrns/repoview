export const VIEWER_PRIVACY_PREFERENCE_COOKIE = 'repoview_viewer_privacy'
export const VIEWER_PRIVACY_PREFERENCE_MAX_AGE = 60 * 60 * 24 * 730

export type ViewerAnalyticsMode = 'necessary' | 'optional'

export function isViewerAnalyticsMode(value: unknown): value is ViewerAnalyticsMode {
  return value === 'necessary' || value === 'optional'
}

export function isGlobalPrivacyControl(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase()
  return normalized === '1' || normalized === 'true'
}

export function isPrivacyPreferenceToken(value: string | null | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{32,128}$/.test(value))
}
