import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { ViewerShell } from '@/components/viewer/viewer-shell'
import { ViewerRepositoryAccessError } from '@/lib/auth/viewer-access'
import { ViewerAuthorizationError } from '@/lib/auth/viewer-session'
import { getViewerPageData } from '@/lib/viewer/page-data'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
}

export default async function ViewerLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ shareId: string }>
}) {
  const { shareId } = await params

  let data: Awaited<ReturnType<typeof getViewerPageData>>
  try {
    data = await getViewerPageData(shareId)
  } catch (error) {
    redirectViewerError(error)
  }

  return (
    <ViewerShell
      shareId={data.shareId}
      repositoryName={data.repositoryName}
      refName={data.refName}
      allowDownload={data.allowDownload}
      analyticsMode={data.analyticsMode}
      gpcApplied={data.gpcApplied}
      root={data.root}
      tree={data.tree}
    >
      {children}
    </ViewerShell>
  )
}

function redirectViewerError(error: unknown): never {
  if (error instanceof ViewerAuthorizationError || error instanceof ViewerRepositoryAccessError) {
    redirect(`/view/error?reason=${error.reason}`)
  }

  throw error
}
