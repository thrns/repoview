import Link from 'next/link'
import { Bell, Github, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'

import { GitHubConnectionStatusAlert } from '@/components/admin/github-connection-card'
import { SettingsAccount } from '@/components/admin/settings-account'
import { SettingsGitHub } from '@/components/admin/settings-github'
import { SettingsNotifications, SettingsPrivacy } from '@/components/admin/settings-preferences'
import { SettingsSecurity } from '@/components/admin/settings-security'
import { SettingsSection } from '@/components/admin/settings-section'
import { Badge } from '@/components/ui'
import { getSettingsPageData } from '@/lib/auth/settings'

export const dynamic = 'force-dynamic'

const sections = [
  { id: 'account', label: 'Account', icon: UserRound },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Data', icon: LockKeyhole },
]

export default async function SettingsPage({ searchParams }: { searchParams?: Promise<{ github?: string | string[]; reauth?: string | string[]; operation?: string | string[] }> }) {
  const data = await getSettingsPageData()
  const params = await searchParams
  const githubStatus = typeof params?.github === 'string' ? params.github : undefined
  const reauthStatus = typeof params?.reauth === 'string' ? params.reauth : undefined
  const reauthOperation = typeof params?.operation === 'string' ? params.operation : undefined
  const canManageWorkspace = data.context.membership.role === 'owner' || data.context.membership.role === 'admin'
  const fullName = data.profile?.full_name ?? getMetadataName(data.context.user.user_metadata)

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <header className="border-b border-border/70 pb-7">
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{data.context.workspace.name}</Badge><span className="font-mono text-[11px] text-foreground-muted">{data.context.membership.role}</span></div>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">Account, access, and privacy controls for your RepoView workspace.</p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[168px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground-muted">Settings</p>
          <nav aria-label="Settings sections" className="mt-3 flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible">
            {sections.map(({ id, label, icon: Icon }) => <Link key={id} href={`#${id}`} className="inline-flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground-muted transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex"><Icon className="size-3.5" aria-hidden="true" />{label}</Link>)}
          </nav>
        </aside>

        <main className="min-w-0 space-y-5">
          {githubStatus ? <GitHubConnectionStatusAlert status={githubStatus} /> : null}

          <SettingsSection id="account" icon={UserRound} title="Account" description="Keep your identity and sign-in details up to date.">
            <SettingsAccount fullName={fullName} email={data.context.user.email ?? ''} emailVerified={data.emailVerified} reauthStatus={reauthStatus} reauthOperation={reauthOperation} />
          </SettingsSection>

          <SettingsSection id="security" icon={ShieldCheck} title="Security" description="Review account protection and the sessions that can access this workspace.">
            <SettingsSecurity lastSignInAt={data.context.user.last_sign_in_at ?? null} activity={data.activity} />
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
        </main>
      </div>
    </section>
  )
}

function getMetadataName(metadata: Record<string, unknown>) {
  const value = metadata.full_name ?? metadata.name
  return typeof value === 'string' ? value : ''
}
