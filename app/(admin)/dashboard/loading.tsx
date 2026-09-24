import { Card, CardContent, CardHeader, Skeleton } from '@/components/ui'

export default function DashboardLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-7 px-5 py-7 sm:px-8 lg:px-10 lg:py-9" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)}
      </div>
      <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-md border border-border sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16 rounded-none" />)}
      </div>
      <Card className="rounded-md shadow-none">
        <CardHeader><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-72 max-w-full" /></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    </section>
  )
}
