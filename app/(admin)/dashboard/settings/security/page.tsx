import { SettingsSecurity } from '@/components/admin/settings-security'
import { SettingsSection } from '@/components/admin/settings-section'
import { getSettingsPageData } from '@/lib/auth/settings'

export const dynamic = 'force-dynamic'

export default async function SecuritySettingsPage() {
  const data = await getSettingsPageData()

  return (
    <SettingsSection id="security">
      <SettingsSecurity activity={data.activity} />
    </SettingsSection>
  )
}
