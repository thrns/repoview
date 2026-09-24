import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, created_at, updated_at')
    .eq('user_id', authData.user.id)
    .order('created_at', { ascending: true })
  if (membershipError) return NextResponse.json({ error: 'Account data could not be exported.' }, { status: 500 })

  const workspaceIds = (membership ?? []).map((item) => item.workspace_id)
  const [profileResult, workspaceResult, settingsResult, installationResult, repositoryResult, shareResult, recipientResult, sessionResult, eventResult, repositoryEventResult, fileEngagementResult, accessAttemptResult, deliveryResult, viewerResult, auditResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url, profile_completed_at, terms_version_accepted, terms_accepted_at, privacy_version_acknowledged, privacy_acknowledged_at, onboarding_completed_at, created_at, updated_at').eq('id', authData.user.id).maybeSingle(),
    workspaceIds.length > 0 ? supabase.from('workspaces').select('id, name, slug, owner_id, is_personal, status, deletion_started_at, deletion_completed_at, created_at, updated_at').in('id', workspaceIds) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('notification_settings').select('workspace_id, destination_email, email_verified, view_opened, returning_view, download, session_summary, security_alerts, digest_frequency, analytics_enabled, analytics_retention_days, created_at, updated_at').in('workspace_id', workspaceIds) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('github_installations').select('id, workspace_id, github_installation_id, github_account_id, github_account_login, github_account_type, repository_selection, permissions, status, suspended_at, created_at, updated_at').in('workspace_id', workspaceIds) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('repositories').select('id, workspace_id, github_installation_id, github_repository_id, github_node_id, github_owner, github_repo, default_branch, enabled, default_rules, created_at, updated_at').in('workspace_id', workspaceIds) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('shares').select('id, workspace_id, repository_id, share_code, share_type, recipient_label, commit_sha, ref, expires_at, revoked_at, notify_on_view, allow_download, rules, note, created_by, created_at, updated_at').in('workspace_id', workspaceIds) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('share_recipients').select('share_id, workspace_id, recipient_name, company, email, role_notes, created_at, updated_at').in('workspace_id', workspaceIds) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('viewer_sessions').select('id, share_id, workspace_id, viewer_id, analytics_mode, gpc_applied, first_seen_at, last_seen_at, ended_at, confirmed_at, notified_at, session_summary_notified_at, active_ms, entry_path, exit_path, referrer_host, browser, os, device_type, vpn_indication, proxy_indication, tor_indication, datacenter_indication, country, region, city, ip_hash, security_signals, is_returning_visit, previous_visit_count, is_probable_bot').in('workspace_id', workspaceIds).order('first_seen_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('view_events').select('*').in('workspace_id', workspaceIds).order('created_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('repository_events').select('*').in('workspace_id', workspaceIds).order('occurred_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('file_engagement').select('*').in('workspace_id', workspaceIds).order('first_viewed_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('share_access_attempts').select('id, share_id, workspace_id, valid, failure_reason, token_age_seconds, ip_hash, referrer_host, is_probable_bot, created_at').in('workspace_id', workspaceIds).order('created_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('notification_deliveries').select('*').in('workspace_id', workspaceIds).order('created_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('viewers').select('id, workspace_id, viewer_code, first_seen_at, last_seen_at').in('workspace_id', workspaceIds).order('first_seen_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('audit_logs').select('workspace_id, actor_id, action, resource_type, resource_id, metadata, created_at').in('workspace_id', workspaceIds).order('created_at', { ascending: false }).limit(500) : Promise.resolve({ data: [], error: null }),
  ])

  const results = [profileResult, workspaceResult, settingsResult, installationResult, repositoryResult, shareResult, recipientResult, sessionResult, eventResult, repositoryEventResult, fileEngagementResult, accessAttemptResult, deliveryResult, viewerResult, auditResult]
  if (results.some((result) => result.error)) return NextResponse.json({ error: 'Account data could not be exported.' }, { status: 500 })

  const payload = {
    exportedAt: new Date().toISOString(),
    account: {
      id: authData.user.id,
      email: authData.user.email,
      createdAt: authData.user.created_at,
      lastSignInAt: authData.user.last_sign_in_at,
      emailConfirmedAt: authData.user.email_confirmed_at,
      providers: authData.user.identities?.map((identity) => identity.provider).filter((provider): provider is string => Boolean(provider)) ?? [],
      userMetadata: authData.user.user_metadata,
    },
    profile: profileResult.data,
    memberships: membership,
    workspaces: workspaceResult.data,
    notificationSettings: settingsResult.data,
    githubInstallations: installationResult.data,
    repositories: repositoryResult.data,
    shares: shareResult.data,
    shareRecipients: recipientResult.data,
    analytics: {
      viewers: viewerResult.data,
      viewerSessions: sessionResult.data,
      viewEvents: eventResult.data,
      repositoryEvents: repositoryEventResult.data,
      fileEngagement: fileEngagementResult.data,
      accessAttempts: accessAttemptResult.data,
      notificationDeliveries: deliveryResult.data,
    },
    activity: auditResult.data,
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'attachment; filename="repoview-account-export.json"',
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}
