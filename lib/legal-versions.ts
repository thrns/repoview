import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './supabase/database.types'

export type CurrentLegalVersions = {
  terms: string
  privacy: string
}

/**
 * Read the current legal versions from the database source of truth.
 *
 * Profile completion uses the same SQL function, so onboarding cannot compare
 * against a different set of versions embedded in the application bundle.
 */
export async function getCurrentLegalVersions(
  supabase: SupabaseClient<Database>,
): Promise<CurrentLegalVersions> {
  const { data, error } = await supabase.rpc('current_legal_versions')
  const row = data?.[0]

  if (error || !row || !row.terms_version || !row.privacy_version) {
    throw new Error('RepoView legal versions could not be loaded.')
  }

  return {
    terms: row.terms_version,
    privacy: row.privacy_version,
  }
}
