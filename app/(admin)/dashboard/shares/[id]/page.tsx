import { Alert, AlertDescription, AlertTitle, Card, CardContent } from '@/components/ui'
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
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Share detail</h1>
          <p className="mt-2 text-sm text-foreground-muted">Review this share's lifecycle and viewer activity.</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Alert className="border-destructive/40">
              <AlertTitle>Share detail unavailable</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }
}
