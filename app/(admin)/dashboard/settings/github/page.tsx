import { GitHubConnectionStatusAlert } from '@/components/admin/github-connection-card'
import { SettingsGitHub } from '@/components/admin/settings-github'
import { SettingsSection } from '@/components/admin/settings-section'
import { getSettingsPageData } from '@/lib/auth/settings'

export const dynamic = 'force-dynamic'

export default async function GitHubSettingsPage({ searchParams }: { searchParams?: Promise<{ github?: string | string[] }> }) {
  const data = await getSettingsPageData()
  const params = await searchParams
  const githubStatus = typeof params?.github === 'string' ? params.github : undefined
  const canManageWorkspace = data.context.membership.role === 'owner' || data.context.membership.role === 'admin'

  return (
    <>
      {githubStatus ? <div className="pt-6"><GitHubConnectionStatusAlert status={githubStatus} /></div> : null}
      <SettingsSection id="github">
        <SettingsGitHub installations={data.installations} canManage={canManageWorkspace} quotaUsage={data.quotaUsage} />
      </SettingsSection>
    </>
  )
}
