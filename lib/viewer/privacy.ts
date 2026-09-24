import 'server-only'

import { generateViewerPrivacyPreferenceToken, hashViewerPrivacyPreference } from '../security/tokens'
import { createSupabaseAdminClient } from '../supabase/admin'
import {
  isPrivacyPreferenceToken,
  type ViewerAnalyticsMode,
} from './privacy-shared'

export { isGlobalPrivacyControl, isViewerAnalyticsMode } from './privacy-shared'
export { VIEWER_PRIVACY_PREFERENCE_COOKIE, VIEWER_PRIVACY_PREFERENCE_MAX_AGE } from './privacy-shared'
export type { ViewerAnalyticsMode } from './privacy-shared'

export async function findViewerPrivacyPreference(rawPreferenceToken: string | undefined) {
  if (!isPrivacyPreferenceToken(rawPreferenceToken)) return null

  const { data, error } = await createSupabaseAdminClient()
    .from('viewer_privacy_preferences')
    .select('analytics_mode, gpc_applied')
    .eq('preference_key_hash', hashViewerPrivacyPreference(rawPreferenceToken))
    .maybeSingle()

  if (error) throw error
  return data
}

export async function saveViewerPrivacyPreference({
  rawPreferenceToken,
  analyticsMode,
  gpcApplied,
}: {
  rawPreferenceToken?: string
  analyticsMode: ViewerAnalyticsMode
  gpcApplied: boolean
}) {
  const rawToken = isPrivacyPreferenceToken(rawPreferenceToken)
    ? rawPreferenceToken
    : generateViewerPrivacyPreferenceToken()
  const { error } = await createSupabaseAdminClient()
    .from('viewer_privacy_preferences')
    .upsert({
      preference_key_hash: hashViewerPrivacyPreference(rawToken),
      analytics_mode: analyticsMode,
      gpc_applied: gpcApplied,
    }, { onConflict: 'preference_key_hash' })

  if (error) throw error
  return { rawToken }
}
