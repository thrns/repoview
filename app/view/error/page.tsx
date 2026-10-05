import type { Metadata } from 'next'

import { ShareError } from '@/components/viewer/share-error'
import { NOINDEX_ROBOTS } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Share unavailable | RepoView',
  robots: NOINDEX_ROBOTS,
}

export default async function ShareErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams
  return <ShareError reason={reason} />
}
