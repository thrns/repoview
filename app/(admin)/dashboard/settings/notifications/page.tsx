import { SettingsNotifications } from '@/components/admin/settings-preferences'
import { SettingsSection } from '@/components/admin/settings-section'
import { getSettingsPageData } from '@/lib/auth/settings'

export const dynamic = 'force-dynamic'

export default async function NotificationsSettingsPage() {
  const data = await getSettingsPageData()
  const canManageWorkspace = data.context.membership.role === 'owner' || data.context.membership.role === 'admin'

  return (
    <SettingsSection id="notifications" title="Notifications" description="Choose where workspace activity alerts go and which events matter to you.">
      <SettingsNotifications settings={data.notificationSettings} canManage={canManageWorkspace} />
    </SettingsSection>
  )
}
