import { LandingPage } from '@/components/landing/landing-page'
import { getLandingAccount } from '@/lib/auth/landing'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const account = await getLandingAccount()
  return <LandingPage account={account ?? undefined} />
}
