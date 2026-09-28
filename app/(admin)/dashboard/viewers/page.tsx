import { Admonition, PageContainer } from '@/components/ui'
import { ViewersView } from '@/components/admin/viewers-view'
import { listViewerDashboardItems } from '@/lib/dashboard/viewers'

export const dynamic = 'force-dynamic'

export default async function ViewersPage() {
  try {
    return <ViewersView items={await listViewerDashboardItems()} />
  } catch (error) {
    return <PageContainer size="default"><Admonition type="destructive" title="Viewer analytics unavailable" description={error instanceof Error ? error.message : 'Try again after checking the data connection.'} /></PageContainer>
  }
}
