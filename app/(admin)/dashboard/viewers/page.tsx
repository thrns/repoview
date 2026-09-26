import { Alert, AlertDescription, AlertTitle } from '@/components/ui'
import { ViewersView } from '@/components/admin/viewers-view'
import { listViewerDashboardItems } from '@/lib/dashboard/viewers'

export const dynamic = 'force-dynamic'

export default async function ViewersPage() {
  try {
    return <ViewersView items={await listViewerDashboardItems()} />
  } catch (error) {
    return <div className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-8 lg:px-10 lg:py-9"><div className="rounded-md border border-destructive/30 bg-destructive/5 p-5"><Alert className="border-0 bg-transparent p-0"><AlertTitle>Viewer analytics unavailable</AlertTitle><AlertDescription>{error instanceof Error ? error.message : 'Try again after checking the data connection.'}</AlertDescription></Alert></div></div>
  }
}
