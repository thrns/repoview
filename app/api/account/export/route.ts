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
  const [profileResult, workspaceResult, settingsResult, installationResult, repositoryResult, shareResult, auditResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, avatar_url, profile_completed_at, terms_version_accepted, terms_accepted_at, privacy_version_acknowledged, privacy_acknowledged_at, onboarding_completed_at, created_at, updated_at').eq('id', authData.user.id).maybeSingle(),
    workspaceIds.length > 0 ? supabase.from('workspaces').select('id, name, slug, owner_id, is_personal, created_at, updated_at').in('id', workspaceIds) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('notification_settings').select('workspace_id, notification_email, notify_on_view, notify_on_returning_view, notify_on_download, notify_on_session_summary, notify_on_security_alert, digest_frequency, analytics_enabled, analytics_retention_days, created_at, updated_at').in('workspace_id', workspaceIds) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('github_installations').select('id, workspace_id, github_installation_id, github_account_id, github_account_login, github_account_type, repository_selection, permissions, status, suspended_at, created_at, updated_at').in('workspace_id', workspaceIds) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('repositories').select('id, workspace_id, github_installation_id, github_repository_id, github_node_id, github_owner, github_repo, default_branch, enabled, default_rules, created_at, updated_at').in('workspace_id', workspaceIds) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('shares').select('id, workspace_id, repository_id, share_code, share_type, recipient_label, commit_sha, ref, expires_at, revoked_at, notify_on_view, allow_download, rules, note, created_by, created_at, updated_at').in('workspace_id', workspaceIds) : Promise.resolve({ data: [], error: null }),
    workspaceIds.length > 0 ? supabase.from('audit_logs').select('workspace_id, actor_id, action, resource_type, resource_id, metadata, created_at').in('workspace_id', workspaceIds).order('created_at', { ascending: false }).limit(500) : Promise.resolve({ data: [], error: null }),
  ])

  const results = [profileResult, workspaceResult, settingsResult, installationResult, repositoryResult, shareResult, auditResult]
  if (results.some((result) => result.error)) return NextResponse.json({ error: 'Account data could not be exported.' }, { status: 500 })

  const payload = {
    exportedAt: new Date().toISOString(),
    account: {
      id: authData.user.id,
      email: authData.user.email,
      createdAt: authData.user.created_at,
      lastSignInAt: authData.user.last_sign_in_at,
      emailConfirmedAt: authData.user.email_confirmed_at,
    },
    profile: profileResult.data,
    memberships: membership,
    workspaces: workspaceResult.data,
    notificationSettings: settingsResult.data,
    githubInstallations: installationResult.data,
    repositories: repositoryResult.data,
    shares: shareResult.data,
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
