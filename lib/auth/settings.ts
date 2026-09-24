import 'server-only'

import { requireWorkspace } from './workspace'
import { createSupabaseServerClient } from '../supabase/server'
import type { Tables } from '../supabase/database.types'

export type SettingsInstallation = {
  id: string
  githubAccountLogin: string
  githubAccountType: Tables<'github_installations'>['github_account_type']
  repositorySelection: Tables<'github_installations'>['repository_selection']
  status: Tables<'github_installations'>['status']
  repositoryCount: number
  enabledRepositoryCount: number
  lastSync: string | null
}

export type SettingsActivity = {
  label: string
  detail: string
  occurredAt: string
}

export type SettingsPageData = {
  context: Awaited<ReturnType<typeof requireWorkspace>>
  profile: Tables<'profiles'> | null
  notificationSettings: Tables<'notification_settings'>
  installations: SettingsInstallation[]
  emailVerified: boolean
  activity: SettingsActivity[]
}

export async function getSettingsPageData(): Promise<SettingsPageData> {
  const context = await requireWorkspace()
  const supabase = await createSupabaseServerClient()

  const [profileResult, notificationResult, installationsResult, repositoriesResult, auditResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', context.user.id).maybeSingle(),
    supabase.from('notification_settings').select('*').eq('workspace_id', context.workspace.id).maybeSingle(),
    supabase
      .from('github_installations')
      .select('id, github_account_login, github_account_type, repository_selection, status')
      .eq('workspace_id', context.workspace.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('repositories')
      .select('id, github_installation_id, enabled, updated_at')
      .eq('workspace_id', context.workspace.id),
    context.membership.role === 'owner' || context.membership.role === 'admin'
      ? supabase
        .from('audit_logs')
        .select('action, resource_type, created_at')
        .eq('workspace_id', context.workspace.id)
        .order('created_at', { ascending: false })
        .limit(4)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (profileResult.error || notificationResult.error || installationsResult.error || repositoriesResult.error) {
    throw new Error('RepoView could not load account settings.')
  }

  const notificationSettings = notificationResult.data ?? createDefaultNotificationSettings(context.workspace.id)
  const repositoryRows = repositoriesResult.data ?? []
  const installations = (installationsResult.data ?? []).map((installation) => {
    const repositories = repositoryRows.filter((repository) => repository.github_installation_id === installation.id)
    const lastSync = repositories
      .map((repository) => repository.updated_at)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => right.localeCompare(left))[0] ?? null

    return {
      id: installation.id,
      githubAccountLogin: installation.github_account_login,
      githubAccountType: installation.github_account_type,
      repositorySelection: installation.repository_selection,
      status: installation.status,
      repositoryCount: repositories.length,
      enabledRepositoryCount: repositories.filter((repository) => repository.enabled).length,
      lastSync,
    }
  })

  const activity: SettingsActivity[] = []
  if (context.user.last_sign_in_at) {
    activity.push({ label: 'Last sign in', detail: 'Authenticated account session', occurredAt: context.user.last_sign_in_at })
  }
  for (const item of auditResult.data ?? []) {
    activity.push({
      label: formatActivityLabel(item.action, item.resource_type),
      detail: 'Workspace activity',
      occurredAt: item.created_at,
    })
  }

  return {
    context,
    profile: profileResult.data as Tables<'profiles'> | null,
    notificationSettings: notificationSettings as Tables<'notification_settings'>,
    installations,
    emailVerified: isEmailVerified(context.user),
    activity: activity.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).slice(0, 4),
  }
}

function createDefaultNotificationSettings(workspaceId: string): Tables<'notification_settings'> {
  const now = new Date(0).toISOString()
  return {
    id: '',
    workspace_id: workspaceId,
    notification_email: null,
    notify_on_view: true,
    notify_on_returning_view: true,
    notify_on_download: false,
    notify_on_session_summary: false,
    notify_on_security_alert: true,
    digest_frequency: 'off',
    analytics_enabled: false,
    analytics_retention_days: 180,
    created_at: now,
    updated_at: now,
  }
}

function isEmailVerified(user: { email_confirmed_at?: string | null; identities?: Array<{ provider?: string }> | undefined }) {
  return Boolean(user.email_confirmed_at || user.identities?.some((identity) => identity.provider === 'google'))
}

function formatActivityLabel(action: string, resourceType: string) {
  const normalizedAction = action.replaceAll('_', ' ')
  const normalizedResource = resourceType.replaceAll('_', ' ')
  return `${capitalize(normalizedAction)} ${normalizedResource}`
}

function capitalize(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : 'Account activity'
}
