import { redirect } from 'next/navigation'

export default async function SettingsPage({ searchParams }: { searchParams?: Promise<{ github?: string | string[]; reauth?: string | string[]; operation?: string | string[] }> }) {
  const params = await searchParams
  const githubStatus = typeof params?.github === 'string' ? params.github : undefined
  const reauthStatus = typeof params?.reauth === 'string' ? params.reauth : undefined
  const reauthOperation = typeof params?.operation === 'string' ? params.operation : undefined

  if (githubStatus) redirect(`/dashboard/settings/github?github=${encodeURIComponent(githubStatus)}`)
  if (reauthStatus) {
    const operationQuery = reauthOperation ? `&operation=${encodeURIComponent(reauthOperation)}` : ''
    redirect(`/dashboard/settings/account?reauth=${encodeURIComponent(reauthStatus)}${operationQuery}`)
  }
  redirect('/dashboard/settings/account')
}
