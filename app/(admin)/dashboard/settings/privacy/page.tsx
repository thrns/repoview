import { SettingsPrivacy } from '@/components/admin/settings-preferences'
import { SettingsSection } from '@/components/admin/settings-section'
import { getSettingsPageData } from '@/lib/auth/settings'

export const dynamic = 'force-dynamic'

export default async function PrivacySettingsPage() {
  const data = await getSettingsPageData()
  const canManageWorkspace = data.context.membership.role === 'owner' || data.context.membership.role === 'admin'

  return (
    <SettingsSection id="privacy" title="Privacy & Data" description="Control optional analytics and understand what RepoView retains to keep shares safe.">
      <SettingsPrivacy settings={data.notificationSettings} canManage={canManageWorkspace} />
    </SettingsSection>
  )
}
