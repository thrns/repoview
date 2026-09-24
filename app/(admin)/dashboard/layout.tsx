import { requireWorkspace } from '@/lib/auth/workspace'
import { AdminShell } from '@/components/admin/admin-shell'
import { getOnboardingState } from '@/lib/auth/onboarding'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [context, onboarding] = await Promise.all([requireWorkspace(), getOnboardingState()])
  return <AdminShell email={context.user.email ?? 'Workspace member'} onboardingIncomplete={!onboarding.isComplete}>{children}</AdminShell>
}
