import { Admonition, PageContainer } from '@/components/ui'
import { ViewerDetailView } from '@/components/admin/viewer-detail-view'
import { getViewerDetail } from '@/lib/dashboard/viewers'
import { requireWorkspace } from '@/lib/auth/workspace'
import { enforceAuthenticatedRateLimit } from '../../../../../lib/security/rate-limit'

export const dynamic = 'force-dynamic'

export default async function ViewerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const context = await requireWorkspace()
    await enforceAuthenticatedRateLimit('authenticated-dashboard-analytics', context.workspace.id, context.user.id)
    return <ViewerDetailView data={await getViewerDetail(id)} />
  } catch (error) {
    return <PageContainer size="default" className="lg:py-10"><Admonition type="destructive" title="Viewer detail unavailable" description={error instanceof Error ? error.message : 'This viewer could not be loaded.'} /></PageContainer>
  }
}
