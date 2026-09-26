import { Card, CardContent, CardHeader, Skeleton } from '@/components/ui'

export default function DashboardLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-7 px-5 py-7 sm:px-8 lg:px-10 lg:py-9" aria-busy="true" aria-label="Loading dashboard">
      <header className="flex flex-col gap-5 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-56 max-w-full" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-3 w-36" />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <MetricSkeleton key={index} />)}
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-border/60 rounded-md border border-border/70 bg-muted/20 sm:grid-cols-4 sm:divide-y-0">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-baseline justify-between gap-3 px-4 py-3 sm:block sm:px-5">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-10" />
            </div>
            <Skeleton className="h-3 w-16 sm:mt-1" />
          </div>
        ))}
      </div>

      <Card className="overflow-hidden rounded-md border-border/70 shadow-none">
        <CardHeader className="gap-2 border-b border-border/60 px-5 py-4 sm:px-6">
          <div className="flex items-baseline justify-between gap-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-full max-w-sm" />
        </CardHeader>
        <div className="border-b border-border/60 px-5 py-4 sm:px-6">
          <div className="flex items-baseline justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="mt-4 grid h-20 grid-cols-7 items-end gap-2 sm:gap-3">
            {Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-full w-full max-w-12 justify-self-center rounded-sm" style={{ height: `${[38, 62, 48, 76, 54, 68, 44][index]}%` }} />)}
          </div>
        </div>
        <CardContent className="space-y-0 p-0">
          {Array.from({ length: 5 }, (_, index) => <ActivitySkeletonRow key={index} />)}
        </CardContent>
      </Card>
    </section>
  )
}

function MetricSkeleton() {
  return (
    <Card className="rounded-md border-border/70 shadow-none">
      <CardContent className="space-y-3 px-4 py-4 sm:px-5 sm:py-[18px]">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  )
}

function ActivitySkeletonRow() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-border/60 px-5 py-3 last:border-b-0 sm:px-6">
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-3.5 rounded-full" />
          <Skeleton className="h-4 w-full max-w-xs" />
        </div>
        <Skeleton className="ml-5 h-3 w-40 max-w-[70%]" />
      </div>
      <Skeleton className="h-3 w-14" />
    </div>
  )
}
