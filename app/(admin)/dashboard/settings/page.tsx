import { Bell, Github, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'

import { GitHubConnectionStatusAlert } from '@/components/admin/github-connection-card'
import { SettingsAccount } from '@/components/admin/settings-account'
import { SettingsGitHub } from '@/components/admin/settings-github'
import { SettingsNotifications, SettingsPrivacy } from '@/components/admin/settings-preferences'
import { SettingsSecurity } from '@/components/admin/settings-security'
import { SettingsSection } from '@/components/admin/settings-section'
import { PageContainer, PageHeader, PageHeaderAside, PageHeaderDescription, PageHeaderSummary, PageHeaderTitle } from '@/components/ui'
import { getSettingsPageData } from '@/lib/auth/settings'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({ searchParams }: { searchParams?: Promise<{ github?: string | string[]; reauth?: string | string[]; operation?: string | string[] }> }) {
  const data = await getSettingsPageData()
  const params = await searchParams
  const githubStatus = typeof params?.github === 'string' ? params.github : undefined
  const reauthStatus = typeof params?.reauth === 'string' ? params.reauth : undefined
  const reauthOperation = typeof params?.operation === 'string' ? params.operation : undefined
  const canManageWorkspace = data.context.membership.role === 'owner' || data.context.membership.role === 'admin'
  const fullName = data.profile?.full_name ?? getMetadataName(data.context.user.user_metadata)

  return (
    <PageContainer size="large" className="overflow-x-hidden lg:py-10">
      <PageHeader className="gap-6 pb-7 sm:items-start">
        <PageHeaderSummary>
          <PageHeaderTitle>Settings</PageHeaderTitle>
          <PageHeaderDescription>Account, access, and privacy controls for your RepoView workspace.</PageHeaderDescription>
        </PageHeaderSummary>
        <PageHeaderAside className="w-full gap-6 border-t border-border-secondary pt-4 sm:w-auto sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <dl className="grid grid-cols-2 gap-x-8 text-sm">
            <div className="min-w-0">
              <dt className="type-meta">Workspace</dt>
              <dd className="mt-1 max-w-56 truncate font-medium" title={data.context.workspace.name}>{data.context.workspace.name}</dd>
            </div>
            <div>
              <dt className="type-meta">Role</dt>
              <dd className="mt-1 font-medium capitalize">{data.context.membership.role}</dd>
            </div>
          </dl>
        </PageHeaderAside>
      </PageHeader>

      <div className="mt-6 min-w-0 space-y-5">
        {githubStatus ? <GitHubConnectionStatusAlert status={githubStatus} /> : null}

        <SettingsSection id="account" icon={UserRound} title="Account" description="Keep your identity and sign-in details up to date.">
          <SettingsAccount fullName={fullName} email={data.context.user.email ?? ''} emailVerified={data.emailVerified} reauthStatus={reauthStatus} reauthOperation={reauthOperation} />
        </SettingsSection>

        <SettingsSection id="security" icon={ShieldCheck} title="Security" description="Review account protection and the sessions that can access this workspace.">
          <SettingsSecurity activity={data.activity} />
        </SettingsSection>

        <SettingsSection id="github" icon={Github} title="GitHub" description="Manage the GitHub accounts and organizations that can provide private repositories.">
          <SettingsGitHub installations={data.installations} canManage={canManageWorkspace} quotaUsage={data.quotaUsage} />
        </SettingsSection>

        <SettingsSection id="notifications" icon={Bell} title="Notifications" description="Choose where workspace activity alerts go and which events matter to you.">
          <SettingsNotifications settings={data.notificationSettings} canManage={canManageWorkspace} />
        </SettingsSection>

        <SettingsSection id="privacy" icon={LockKeyhole} title="Privacy & Data" description="Control optional analytics and understand what RepoView retains to keep shares safe.">
          <SettingsPrivacy settings={data.notificationSettings} canManage={canManageWorkspace} />
        </SettingsSection>
      </div>
    </PageContainer>
  )
}

function getMetadataName(metadata: Record<string, unknown>) {
  const value = metadata.full_name ?? metadata.name
  return typeof value === 'string' ? value : ''
}
