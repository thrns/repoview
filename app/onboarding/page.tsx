import { redirect } from 'next/navigation'

import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { getOnboardingState } from '@/lib/auth/onboarding'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage({ searchParams }: { searchParams?: Promise<{ github?: string | string[] }> }) {
  let state
  try {
    state = await getOnboardingState()
  } catch {
    redirect('/login')
  }

  if (state.isComplete) redirect('/dashboard')
  const params = await searchParams
  const githubStatus = typeof params?.github === 'string' ? params.github : undefined
  return <OnboardingFlow state={state} githubStatus={githubStatus} />
}
