import { requireAdmin } from '@/lib/auth/require-admin'
import { AdminShell } from '@/components/admin/admin-shell'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()
  return <AdminShell email={user.email ?? 'Owner'}>{children}</AdminShell>
}
