import { SettingsAccount } from '@/components/admin/settings-account'
import { SettingsSection } from '@/components/admin/settings-section'
import { getSettingsPageData } from '@/lib/auth/settings'

export const dynamic = 'force-dynamic'

export default async function AccountSettingsPage({ searchParams }: { searchParams?: Promise<{ reauth?: string | string[]; operation?: string | string[] }> }) {
  const data = await getSettingsPageData()
  const params = await searchParams
  const reauthStatus = typeof params?.reauth === 'string' ? params.reauth : undefined
  const reauthOperation = typeof params?.operation === 'string' ? params.operation : undefined
  const fullName = data.profile?.full_name ?? getMetadataName(data.context.user.user_metadata)

  return (
    <SettingsSection id="account">
      <SettingsAccount fullName={fullName} email={data.context.user.email ?? ''} emailVerified={data.emailVerified} reauthStatus={reauthStatus} reauthOperation={reauthOperation} />
    </SettingsSection>
  )
}

function getMetadataName(metadata: Record<string, unknown>) {
  const value = metadata.full_name ?? metadata.name
  return typeof value === 'string' ? value : ''
}
