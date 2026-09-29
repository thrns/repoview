import { SettingsPageLoading } from '@/components/admin/settings-loading'

export default function NotificationsSettingsLoading() {
  return <SettingsPageLoading cards={[{ rows: 2 }, { rows: 5, footer: true }]} />
}
