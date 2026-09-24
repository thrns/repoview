import 'server-only'

import type { User } from '@supabase/supabase-js'

import { getCurrentLegalVersions } from '../legal-versions'
import { createSupabaseAdminClient } from '../supabase/admin'
import { createSupabaseServerClient } from '../supabase/server'
import type { Tables } from '../supabase/database.types'

export type OnboardingStep = 'verify_email' | 'profile' | 'github' | 'repositories' | 'share' | 'complete'

export type OnboardingState = {
  step: OnboardingStep
  isComplete: boolean
  emailVerified: boolean
  userEmail: string
  profile: Tables<'profiles'> | null
  workspace: Tables<'workspaces'> | null
  installations: Tables<'github_installations'>[]
  hasPendingGitHubConnection: boolean
  hasSuspendedGitHubInstallation: boolean
  enabledRepositoryCount: number
  shareCount: number
}

export async function getOnboardingState(): Promise<OnboardingState> {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    throw new Error('Authentication is required.')
  }

  return loadOnboardingState(supabase, authData.user)
}

export function getOnboardingLabel(step: OnboardingStep) {
  return {
    verify_email: 'Verify your email',
    profile: 'Finish your profile',
    github: 'Connect GitHub',
    repositories: 'Choose repositories',
    share: 'Create your first share',
    complete: 'You are ready to go',
  }[step]
}

async function loadOnboardingState(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  user: User,
): Promise<OnboardingState> {
  const [profileResult, membershipResult, legalVersions] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('workspace_members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    getCurrentLegalVersions(supabase),
  ])

  if (profileResult.error || membershipResult.error) {
    throw new Error('RepoView onboarding could not be loaded.')
  }

  const profile = profileResult.data as Tables<'profiles'> | null
  const membership = membershipResult.data
  const workspaceResult = membership
    ? await supabase.from('workspaces').select('*').eq('id', membership.workspace_id).maybeSingle()
    : null
  if (workspaceResult?.error) {
    throw new Error('RepoView onboarding could not be loaded.')
  }
  const workspace = workspaceResult?.data as Tables<'workspaces'> | null

  if (!workspace) {
    return {
      step: 'profile',
      isComplete: false,
      emailVerified: isEmailVerified(user),
      userEmail: user.email ?? '',
      profile,
      workspace: null,
      installations: [],
      hasPendingGitHubConnection: false,
      hasSuspendedGitHubInstallation: false,
      enabledRepositoryCount: 0,
      shareCount: 0,
    }
  }

  const [installationsResult, repositoriesResult, sharesResult, pendingResult] = await Promise.all([
    supabase.from('github_installations').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: true }),
    supabase.from('repositories').select('id, enabled').eq('workspace_id', workspace.id),
    supabase.from('shares').select('id').eq('workspace_id', workspace.id),
    getPendingConnection(user.id),
  ])

  if (installationsResult.error || repositoriesResult.error || sharesResult.error) {
    throw new Error('RepoView onboarding could not be loaded.')
  }

  const installations = (installationsResult.data ?? []) as Tables<'github_installations'>[]
  const enabledRepositoryCount = (repositoriesResult.data ?? []).filter((repository) => repository.enabled).length
  const shareCount = sharesResult.data?.length ?? 0
  const isLegacyComplete = Boolean(profile?.onboarding_completed_at)
  const emailVerified = isLegacyComplete || isEmailVerified(user)
  const profileComplete = isLegacyComplete || Boolean(
    profile?.profile_completed_at
      && profile.terms_version_accepted === legalVersions.terms
      && profile.privacy_version_acknowledged === legalVersions.privacy,
  )
  const hasActiveInstallation = installations.some((installation) => installation.status === 'active')
  const hasSuspendedInstallation = installations.some((installation) => installation.status === 'suspended')

  let step: OnboardingStep = 'complete'
  if (!emailVerified) step = 'verify_email'
  else if (!profileComplete) step = 'profile'
  else if (!hasActiveInstallation) step = 'github'
  else if (enabledRepositoryCount === 0) step = 'repositories'
  else if (shareCount === 0) step = 'share'

  return {
    step,
    isComplete: step === 'complete',
    emailVerified,
    userEmail: user.email ?? '',
    profile,
    workspace,
    installations,
    hasPendingGitHubConnection: pendingResult || hasSuspendedInstallation,
    hasSuspendedGitHubInstallation: hasSuspendedInstallation,
    enabledRepositoryCount,
    shareCount,
  }
}

async function getPendingConnection(userId: string) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('github_connection_transactions')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['pending_installation', 'awaiting_authorization', 'pending_approval'])
    .gt('expires_at', new Date().toISOString())
    .limit(1)

  return !error && Boolean(data?.length)
}

function isEmailVerified(user: User) {
  if (user.email_confirmed_at) return true
  const provider = typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : null
  return provider === 'google' || user.identities?.some((identity) => identity.provider === 'google') === true
}
