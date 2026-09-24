import { Alert, AlertDescription, AlertTitle, Card, CardContent } from '@/components/ui'
import { SharesView } from '@/components/admin/shares-view'
import { listShareDashboardItems } from '@/lib/shares/dashboard'

export const dynamic = 'force-dynamic'

export default async function SharesPage() {
  try {
    const items = await listShareDashboardItems()
    return <SharesView items={items.map(({ share, repository, status, confirmedViews, lastViewedAt }) => ({
      share: {
        id: share.id,
        share_code: share.share_code,
        recipient_label: share.recipient_label,
        ref: share.ref,
        expires_at: share.expires_at,
        note: share.note,
        created_at: share.created_at,
      },
      repository: repository ? { github_owner: repository.github_owner, github_repo: repository.github_repo } : null,
      status,
      confirmedViews,
      lastViewedAt,
    }))} />
  } catch (error) {
    return (
      <section className="mx-auto w-full max-w-[1400px] space-y-5 px-5 py-7 sm:px-8 lg:px-10 lg:py-8">
        <header className="border-b border-border/70 pb-6">
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em]">Shares</h1>
          <p className="mt-1.5 text-sm leading-6 text-foreground-muted">Manage recipient-specific repository previews.</p>
        </header>
        <Card className="rounded-md border-border/70 shadow-none">
          <CardContent className="p-5 sm:p-6">
            <Alert className="border-destructive/40">
              <AlertTitle>Share list unavailable</AlertTitle>
              <AlertDescription>{error instanceof Error ? error.message : 'Try again after checking the database connection.'}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>
    )
  }
}
