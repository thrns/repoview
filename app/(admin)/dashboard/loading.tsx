import { Card, CardContent, CardHeader, Skeleton } from '@/components/ui'

export default function DashboardLoading() {
  return (
    <section className="mx-auto flex min-h-full w-full max-w-6xl items-start px-5 py-7 sm:px-8 lg:px-10 lg:py-9" aria-busy="true" aria-label="Checking workspace setup">
      <Card className="w-full max-w-2xl rounded-md shadow-none">
        <CardHeader>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <p className="text-sm text-foreground-muted" role="status">Checking your workspace setup…</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-10 w-36" />
        </CardContent>
      </Card>
    </section>
  )
}
