import { NextResponse } from 'next/server'

import { consumeStepUpConfirmation } from '@/lib/account/step-up'
import { AUDIT_ACTIONS, recordAuditLogBestEffort, type AuditAction } from '@/lib/audit-log'
import { checkRateLimits, rateLimitResponse, rateLimitUnavailableResponse } from '@/lib/security/rate-limit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ACCOUNT_EXPORT_PAGE_SIZE = 500
const ACCOUNT_EXPORT_MAX_WORKSPACES = 500

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return response({ error: 'authentication_required' }, 401)

  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, created_at, updated_at')
    .eq('user_id', authData.user.id)
    .order('created_at', { ascending: true })
    .limit(ACCOUNT_EXPORT_MAX_WORKSPACES + 1)

  if (membershipError) return response({ error: 'account_data_unavailable' }, 500)
  if ((memberships ?? []).length > ACCOUNT_EXPORT_MAX_WORKSPACES) {
    return response({ error: 'account_export_too_large', detail: 'Reduce workspace membership count before exporting this account.' }, 413)
  }

  const workspaceIds = (memberships ?? []).map((item) => item.workspace_id)
  const admin = createSupabaseAdminClient()
  try {
    const decision = await checkRateLimits('authenticated-account-export', [
      { value: `user:${authData.user.id}` },
      ...workspaceIds.map((workspaceId) => ({ value: `workspace:${workspaceId}` })),
    ])
    if (decision) {
      await recordExportAudit(admin, workspaceIds, authData.user.id, AUDIT_ACTIONS.accountExportFailed, { reason: 'rate_limited' })
      return rateLimitResponse(decision)
    }
  } catch {
    await recordExportAudit(admin, workspaceIds, authData.user.id, AUDIT_ACTIONS.accountExportFailed, { reason: 'rate_limit_unavailable' })
    return rateLimitUnavailableResponse()
  }

  let confirmed: boolean
  try {
    confirmed = await consumeStepUpConfirmation({
      admin,
      userId: authData.user.id,
      operation: 'account-export',
    })
  } catch {
    await recordExportAudit(admin, workspaceIds, authData.user.id, AUDIT_ACTIONS.accountExportFailed, { reason: 'reauthentication_unavailable' })
    return response({ error: 'reauthentication_unavailable' }, 503)
  }
  if (!confirmed) {
    await recordExportAudit(admin, workspaceIds, authData.user.id, AUDIT_ACTIONS.accountExportFailed, { reason: 'recent_auth_required' })
    return response({ error: 'recent_auth_required' }, 401)
  }

  await recordExportAudit(admin, workspaceIds, authData.user.id, AUDIT_ACTIONS.accountExportRequested, { format: 'json' })

  const profileResult = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, profile_completed_at, terms_version_accepted, terms_accepted_at, privacy_version_acknowledged, privacy_acknowledged_at, onboarding_completed_at, created_at, updated_at')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (profileResult.error) {
    await recordExportAudit(admin, workspaceIds, authData.user.id, AUDIT_ACTIONS.accountExportFailed, { reason: 'profile_lookup' })
    return response({ error: 'account_data_unavailable' }, 500)
  }

  const account = {
    id: authData.user.id,
    email: authData.user.email,
    createdAt: authData.user.created_at,
    lastSignInAt: authData.user.last_sign_in_at,
    emailConfirmedAt: authData.user.email_confirmed_at,
    providers: authData.user.identities?.map((identity) => identity.provider).filter((provider): provider is string => Boolean(provider)) ?? [],
    userMetadata: authData.user.user_metadata,
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      const write = (value: string) => controller.enqueue(encoder.encode(value))

      try {
        write('{')
        write(`"exportedAt":${JSON.stringify(new Date().toISOString())},`)
        write(`"account":${JSON.stringify(account)},`)
        write(`"profile":${JSON.stringify(profileResult.data)},`)
        write('"memberships":')
        await streamValues(write, memberships ?? [])
        write(',"workspaces":')
        await streamPaged(write, (from, to) => workspaceIds.length > 0
          ? supabase.from('workspaces').select('id, name, slug, owner_id, is_personal, status, deletion_started_at, deletion_completed_at, created_at, updated_at').in('id', workspaceIds).range(from, to)
          : emptyPage())
        write(',"notificationSettings":')
        await streamPaged(write, (from, to) => workspaceIds.length > 0
          ? supabase.from('notification_settings').select('workspace_id, destination_email, email_verified, view_opened, returning_view, download, session_summary, security_alerts, digest_frequency, analytics_enabled, analytics_retention_days, created_at, updated_at').in('workspace_id', workspaceIds).range(from, to)
          : emptyPage())
        write(',"githubInstallations":')
        await streamPaged(write, (from, to) => workspaceIds.length > 0
          ? supabase.from('github_installations').select('id, workspace_id, github_installation_id, github_account_id, github_account_login, github_account_type, repository_selection, permissions, status, suspended_at, created_at, updated_at').in('workspace_id', workspaceIds).range(from, to)
          : emptyPage())
        write(',"repositories":')
        await streamPaged(write, (from, to) => workspaceIds.length > 0
          ? supabase.from('repositories').select('id, workspace_id, github_installation_id, github_repository_id, github_node_id, github_owner, github_repo, default_branch, enabled, default_rules, created_at, updated_at').in('workspace_id', workspaceIds).range(from, to)
          : emptyPage())
        write(',"shares":')
        await streamPaged(write, (from, to) => workspaceIds.length > 0
          ? supabase.from('shares').select('id, workspace_id, repository_id, share_code, share_type, recipient_label, commit_sha, ref, expires_at, revoked_at, notify_on_view, allow_download, rules, note, created_by, created_at, updated_at').in('workspace_id', workspaceIds).range(from, to)
          : emptyPage())
        write(',"shareRecipients":')
        await streamPaged(write, (from, to) => workspaceIds.length > 0
          ? supabase.from('share_recipients').select('share_id, workspace_id, recipient_name, company, email, role_notes, created_at, updated_at').in('workspace_id', workspaceIds).range(from, to)
          : emptyPage())
        write(',"analytics":{')
        write('"viewers":')
        await streamPaged(write, (from, to) => workspaceIds.length > 0
          ? supabase.from('viewers').select('id, workspace_id, viewer_code, first_seen_at, last_seen_at').in('workspace_id', workspaceIds).order('first_seen_at', { ascending: true }).range(from, to)
          : emptyPage())
        write(',"viewerSessions":')
        await streamPaged(write, (from, to) => workspaceIds.length > 0
          ? supabase.from('viewer_sessions').select('id, share_id, workspace_id, viewer_id, analytics_mode, gpc_applied, first_seen_at, last_seen_at, ended_at, confirmed_at, notified_at, session_summary_notified_at, active_ms, entry_path, exit_path, referrer_host, browser, os, device_type, vpn_indication, proxy_indication, tor_indication, datacenter_indication, country, region, city, ip_hash, security_signals, is_returning_visit, previous_visit_count, is_probable_bot').in('workspace_id', workspaceIds).order('first_seen_at', { ascending: true }).range(from, to)
          : emptyPage())
        write(',"viewEvents":')
        await streamPaged(write, (from, to) => workspaceIds.length > 0
          ? supabase.from('view_events').select('id, share_id, session_id, workspace_id, event_type, path, metadata, created_at').in('workspace_id', workspaceIds).order('created_at', { ascending: true }).range(from, to)
          : emptyPage())
        write(',"repositoryEvents":')
        await streamPaged(write, (from, to) => workspaceIds.length > 0
          ? supabase.from('repository_events').select('id, share_id, session_id, workspace_id, viewer_id, event_type, path, metadata, occurred_at, created_at').in('workspace_id', workspaceIds).order('occurred_at', { ascending: true }).range(from, to)
          : emptyPage())
        write(',"fileEngagement":')
        await streamPaged(write, (from, to) => workspaceIds.length > 0
          ? supabase.from('file_engagement').select('id, share_id, session_id, workspace_id, viewer_id, path, content_kind, first_viewed_at, last_viewed_at, view_count, active_ms, first_view_order').in('workspace_id', workspaceIds).order('first_viewed_at', { ascending: true }).range(from, to)
          : emptyPage())
        write(',"accessAttempts":')
        await streamPaged(write, (from, to) => workspaceIds.length > 0
          ? supabase.from('share_access_attempts').select('id, share_id, workspace_id, valid, failure_reason, token_age_seconds, ip_hash, referrer_host, is_probable_bot, created_at').in('workspace_id', workspaceIds).order('created_at', { ascending: true }).range(from, to)
          : emptyPage())
        write(',"notificationDeliveries":')
        await streamPaged(write, (from, to) => workspaceIds.length > 0
          ? supabase.from('notification_deliveries').select('id, share_id, session_id, workspace_id, channel, recipient, notification_kind, status, attempt_count, provider_message_id, last_error, next_retry_at, idempotency_key, payload, created_at, sent_at').in('workspace_id', workspaceIds).order('created_at', { ascending: true }).range(from, to)
          : emptyPage())
        write('},"activity":')
        await streamPaged(write, (from, to) => workspaceIds.length > 0
          ? supabase.from('audit_logs').select('workspace_id, actor_user_id, action, resource_type, resource_id, metadata, created_at').in('workspace_id', workspaceIds).order('created_at', { ascending: false }).range(from, to)
          : emptyPage())
        write('}')
        await recordExportAudit(admin, workspaceIds, authData.user.id, AUDIT_ACTIONS.accountExportSucceeded, { format: 'json' })
        controller.close()
      } catch (error) {
        await recordExportAudit(admin, workspaceIds, authData.user.id, AUDIT_ACTIONS.accountExportFailed, {
          reason: 'stream_failed',
        })
        controller.error(error)
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'attachment; filename="repoview-account-export.json"',
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

async function streamPaged<T>(write: (value: string) => void, fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>) {
  let first = true
  let from = 0
  write('[')
  while (true) {
    const { data, error } = await fetchPage(from, from + ACCOUNT_EXPORT_PAGE_SIZE - 1)
    if (error) throw new Error(error.message ?? 'export_page_failed')
    const rows = data ?? []
    for (const row of rows) {
      if (!first) write(',')
      write(JSON.stringify(row))
      first = false
    }
    if (rows.length < ACCOUNT_EXPORT_PAGE_SIZE) break
    from += ACCOUNT_EXPORT_PAGE_SIZE
  }
  write(']')
}

async function streamValues<T>(write: (value: string) => void, values: T[]) {
  write('[')
  values.forEach((value, index) => {
    if (index > 0) write(',')
    write(JSON.stringify(value))
  })
  write(']')
}

function emptyPage() {
  return Promise.resolve({ data: [], error: null })
}

async function recordExportAudit(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  workspaceIds: string[],
  userId: string,
  action: AuditAction,
  metadata: Record<string, unknown>,
) {
  await Promise.all(workspaceIds.map((workspaceId) => recordAuditLogBestEffort({
    workspaceId,
    actorUserId: userId,
    action,
    resourceType: 'account',
    resourceId: userId,
    metadata,
  }, admin)))
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
