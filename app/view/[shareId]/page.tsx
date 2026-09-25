import { after } from 'next/server'
import { redirect } from 'next/navigation'

import { RootRepositoryView } from '@/components/viewer/root-repository-view'
import { ViewerRepositoryAccessError } from '@/lib/auth/viewer-access'
import { ViewerAuthorizationError } from '@/lib/auth/viewer-session'
import { getViewerPageData } from '@/lib/viewer/page-data'
import { recordViewerViewEvent } from '@/lib/viewer/view-events'

export const dynamic = 'force-dynamic'

export default async function ViewerHomePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params

  try {
    const data = await getViewerPageData(shareId)
    if (data.root.status === 'ready' && data.root.readme) {
      const readme = data.root.readme
      after(() => recordViewerViewEvent({
        shareId: data.internalShareId,
        sessionId: data.sessionId,
        workspaceId: data.workspaceId,
        analyticsMode: data.analyticsMode,
        gpcApplied: data.gpcApplied,
        eventType: 'markdown_viewed',
        path: readme.path,
        metadata: { route: 'root', preview: 'markdown' },
      }).catch(() => undefined))
    }
    return <RootRepositoryView shareId={data.shareId} tree={data.tree} root={data.root} allowDownload={data.allowDownload} />
  } catch (error) {
    if (error instanceof ViewerAuthorizationError || error instanceof ViewerRepositoryAccessError) {
      redirect(`/view/error?reason=${error.reason}`)
    }
    throw error
  }
}
