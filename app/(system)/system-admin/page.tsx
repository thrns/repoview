import { SystemAdminOverviewView } from '@/components/system-admin/system-admin-overview'
import { requireSystemAdmin } from '@/lib/auth/system-admin'
import { recordSystemAdminAuditLogBestEffort, SYSTEM_ADMIN_AUDIT_ACTIONS } from '@/lib/system-admin/audit'
import { getSystemAdminOverview } from '@/lib/system-admin/overview'

export const dynamic = 'force-dynamic'

export default async function SystemAdminPage() {
  const context = await requireSystemAdmin()
  const overview = await getSystemAdminOverview()
  await recordSystemAdminAuditLogBestEffort({
    actorUserId: context.user.id,
    action: SYSTEM_ADMIN_AUDIT_ACTIONS.overviewViewed,
    resourceType: 'system_overview',
    metadata: { failed_webhooks: overview.failedWebhooks.length, failed_notifications: overview.failedNotifications.length },
  })
  return <SystemAdminOverviewView overview={overview} />
}
