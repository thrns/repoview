import { Alert, AlertDescription, AlertTitle, Card, CardContent } from '@/components/ui'
import { ViewersView } from '@/components/admin/viewers-view'
import { listViewerDashboardItems } from '@/lib/dashboard/viewers'

export const dynamic = 'force-dynamic'

export default async function ViewersPage() {
  try {
    return <ViewersView items={await listViewerDashboardItems()} />
  } catch (error) {
    return <div className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10 lg:py-14"><Card><CardContent className="pt-6"><Alert className="border-destructive/40"><AlertTitle>Viewer analytics unavailable</AlertTitle><AlertDescription>{error instanceof Error ? error.message : 'Try again after checking the data connection.'}</AlertDescription></Alert></CardContent></Card></div>
  }
}
