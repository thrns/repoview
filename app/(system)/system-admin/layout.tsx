import { requireSystemAdmin } from '@/lib/auth/system-admin'
import { SystemAdminShell } from '@/components/system-admin/system-admin-shell'

export const dynamic = 'force-dynamic'

export default async function SystemAdminLayout({ children }: { children: React.ReactNode }) {
  const context = await requireSystemAdmin()
  return <SystemAdminShell email={context.user.email ?? 'Operator'}>{children}</SystemAdminShell>
}
