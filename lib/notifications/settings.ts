import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Tables } from '../supabase/database.types'

type NotificationSettingsRow = Pick<Tables<'notification_settings'>, 'destination_email' | 'email_verified' | 'view_opened' | 'session_summary'>

const notificationSettingsSelect = 'destination_email, email_verified, view_opened, session_summary'

/**
 * Fill only an unconfigured notification destination from the authenticated
 * account. A non-empty destination is always treated as an explicit choice.
 */
export async function ensureNotificationDestination(
  client: SupabaseClient<Database>,
  input: {
    workspaceId: string
    accountEmail: string | null | undefined
    accountEmailConfirmed: boolean
  },
): Promise<NotificationSettingsRow | null> {
  const accountEmail = normalizeEmail(input.accountEmail)
  const { data: current, error: lookupError } = await client
    .from('notification_settings')
    .select(notificationSettingsSelect)
    .eq('workspace_id', input.workspaceId)
    .maybeSingle()

  if (lookupError) throw lookupError

  if (current && current.destination_email?.trim()) {
    if (input.accountEmailConfirmed && normalizeEmail(current.destination_email) === accountEmail && !current.email_verified) {
      const { data: verifiedSettings, error: verifyError } = await client
        .from('notification_settings')
        .update({ email_verified: true })
        .eq('workspace_id', input.workspaceId)
        .eq('email_verified', false)
        .select(notificationSettingsSelect)
        .maybeSingle()
      if (verifyError) throw verifyError
      return verifiedSettings ?? current
    }
    return current
  }

  if (!accountEmail) return current

  if (!current) {
    const { data: inserted, error: insertError } = await client
      .from('notification_settings')
      .insert({
        workspace_id: input.workspaceId,
        destination_email: accountEmail,
        email_verified: input.accountEmailConfirmed,
        view_opened: true,
      })
      .select(notificationSettingsSelect)
      .maybeSingle()
    if (!insertError) return inserted
    // Another request may have provisioned the row between the lookup and
    // insert. Re-read it and preserve that request's explicit destination.
    if (insertError.code !== '23505') throw insertError
    const { data: racedSettings, error: raceLookupError } = await client
      .from('notification_settings')
      .select(notificationSettingsSelect)
      .eq('workspace_id', input.workspaceId)
      .maybeSingle()
    if (raceLookupError) throw raceLookupError
    return racedSettings
  }

  const updateQuery = client
    .from('notification_settings')
    .update({
      destination_email: accountEmail,
      email_verified: input.accountEmailConfirmed,
    })
    .eq('workspace_id', input.workspaceId)
  const { data: initialized, error: updateError } = await (current.destination_email === null
    ? updateQuery.is('destination_email', null)
    : updateQuery.eq('destination_email', current.destination_email)).select(notificationSettingsSelect).maybeSingle()
  if (updateError) throw updateError
  return initialized ?? current
}

export function normalizeEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase()
  return normalized || null
}
