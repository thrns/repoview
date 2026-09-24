import { requireWorkspace } from '@/lib/auth/workspace'
import { AdminShell } from '@/components/admin/admin-shell'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await requireWorkspace()
  return <AdminShell email={context.user.email ?? 'Workspace member'}>{children}</AdminShell>
}
