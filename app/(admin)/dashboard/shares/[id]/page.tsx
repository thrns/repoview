import { Admonition, PageContainer } from '@/components/ui'
import { ShareDetailView } from '@/components/admin/share-detail-view'
import { ShareDetailNotFoundError, getShareDetail } from '@/lib/shares/detail'

export const dynamic = 'force-dynamic'

export default async function ShareDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const data = await getShareDetail(id)
    return <ShareDetailView data={data} />
  } catch (error) {
    const message = error instanceof ShareDetailNotFoundError
      ? 'This share does not exist or is no longer available.'
      : error instanceof Error
        ? error.message
        : 'Share detail could not be loaded.'

    return (
      <PageContainer size="default" className="space-y-6">
        <Admonition type="destructive" title="Share detail unavailable" description={message} />
      </PageContainer>
    )
  }
}
