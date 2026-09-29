import { SettingsSecurity } from '@/components/admin/settings-security'
import { SettingsSection } from '@/components/admin/settings-section'
import { getSettingsPageData } from '@/lib/auth/settings'

export const dynamic = 'force-dynamic'

export default async function SecuritySettingsPage() {
  const data = await getSettingsPageData()

  return (
    <SettingsSection id="security" title="Security" description="Review account protection and the sessions that can access this workspace.">
      <SettingsSecurity activity={data.activity} />
    </SettingsSection>
  )
}
