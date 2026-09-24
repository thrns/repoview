import type { Metadata } from 'next'

import { ShareError } from '@/components/viewer/share-error'

export const metadata: Metadata = {
  title: 'Share unavailable | RepoView',
  robots: { index: false, follow: false },
}

export default async function ShareErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams
  return <ShareError reason={reason} />
}
