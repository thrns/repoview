import type { Metadata } from 'next'

import { requireWorkspace } from '@/lib/auth/workspace'
import { AdminShell } from '@/components/admin/admin-shell'
import { getOnboardingState } from '@/lib/auth/onboarding'
import { NOINDEX_ROBOTS } from '@/lib/seo'

export const metadata: Metadata = { robots: NOINDEX_ROBOTS }
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [context, onboarding] = await Promise.all([requireWorkspace(), getOnboardingState()])
  return (
    <AdminShell
      email={context.user.email ?? 'Workspace member'}
      displayName={onboarding.profile?.full_name ?? getMetadataName(context.user.user_metadata)}
      onboardingIncomplete={!onboarding.isComplete}
      workspaceName={context.workspace.name}
      workspaces={context.availableWorkspaces.map(({ workspace, membership }) => ({ id: workspace.id, name: workspace.name, role: membership.role }))}
    >
      {children}
    </AdminShell>
  )
}

function getMetadataName(metadata: Record<string, unknown>) {
  const value = metadata.full_name ?? metadata.name
  return typeof value === 'string' ? value : undefined
}
