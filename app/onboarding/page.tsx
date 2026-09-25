import { redirect } from 'next/navigation'

import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { getOnboardingState } from '@/lib/auth/onboarding'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage({ searchParams }: { searchParams?: Promise<{ github?: string | string[]; repositories?: string | string[] }> }) {
  let state
  try {
    state = await getOnboardingState()
  } catch (error) {
    if (isRedirectError(error)) throw error
    redirect('/login')
  }

  const params = await searchParams
  const githubStatus = typeof params?.github === 'string' ? params.github : undefined
  const repositoryCount = parseRepositoryCount(params?.repositories)

  if (state.isComplete && githubStatus !== 'success') redirect('/dashboard')
  return <OnboardingFlow state={state} githubStatus={githubStatus} repositoryCount={repositoryCount} />
}

function parseRepositoryCount(value: string | string[] | undefined) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return undefined
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

function isRedirectError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'digest' in error && String(error.digest).startsWith('NEXT_REDIRECT'))
}
