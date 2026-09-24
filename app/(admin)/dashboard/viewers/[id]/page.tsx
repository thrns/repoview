import { Alert, AlertDescription, AlertTitle, Card, CardContent } from '@/components/ui'
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
    return <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10 lg:py-14"><Card><CardContent className="pt-6"><Alert className="border-destructive/40"><AlertTitle>Viewer detail unavailable</AlertTitle><AlertDescription>{error instanceof Error ? error.message : 'This viewer could not be loaded.'}</AlertDescription></Alert></CardContent></Card></div>
  }
}
