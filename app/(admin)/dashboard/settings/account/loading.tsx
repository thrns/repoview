import { SettingsPageLoading } from '@/components/admin/settings-loading'

export default function AccountSettingsLoading() {
  return <SettingsPageLoading cards={[{ rows: 2, footer: true }, { rows: 2 }, { rows: 1 }]} />
}
