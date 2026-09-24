import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { ViewerShell } from '@/components/viewer/viewer-shell'
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
  } catch {
    redirect('/view/error?reason=invalid')
  }

  return (
    <ViewerShell
      shareId={data.shareId}
      repositoryName={data.repositoryName}
      refName={data.refName}
      allowDownload={data.allowDownload}
      root={data.root}
      tree={data.tree}
    >
      {children}
    </ViewerShell>
  )
}
