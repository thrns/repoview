import { Admonition, PageContainer } from '@/components/ui'
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
        share_type: share.share_type,
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
      <PageContainer size="large" className="space-y-5">
        <Admonition type="destructive" title="Share list unavailable" description={error instanceof Error ? error.message : 'Try again after checking the database connection.'} />
      </PageContainer>
    )
  }
}
