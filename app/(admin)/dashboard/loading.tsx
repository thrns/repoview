import { Skeleton } from '@/components/ui'

export default function DashboardLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-5 py-7 sm:px-8 lg:px-10 lg:py-9" aria-busy="true" aria-label="Loading dashboard">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56 max-w-full" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-10 w-28" />
      </header>

      <section className="space-y-3" aria-hidden="true">
        <div className="flex items-center justify-between gap-4"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-20" /></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <MetricSkeleton key={index} />)}
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/35 px-4 py-3.5 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2.5"><Skeleton className="size-7 rounded-md" /><div className="space-y-1"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-48 max-w-full" /></div></div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:flex lg:gap-6"><SignalSkeleton /><SignalSkeleton /><SignalSkeleton /><SignalSkeleton /></div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)] xl:items-start">
        <section className="overflow-hidden rounded-lg border border-border/70 bg-card" aria-hidden="true">
          <header className="flex items-start justify-between gap-4 border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
            <div className="space-y-2"><div className="flex items-center gap-2.5"><Skeleton className="size-7 rounded-md" /><Skeleton className="h-6 w-36" /></div><Skeleton className="h-4 w-72 max-w-full" /></div>
            <Skeleton className="h-4 w-28" />
          </header>
          <div className="divide-y divide-border/60">{Array.from({ length: 5 }, (_, index) => <ActivitySkeletonRow key={index} />)}</div>
        </section>

        <section className="overflow-hidden rounded-lg border border-border/70 bg-card" aria-hidden="true">
          <header className="flex items-start justify-between gap-4 border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6"><div className="space-y-2"><div className="flex items-center gap-2.5"><Skeleton className="size-7 rounded-md" /><Skeleton className="h-5 w-24" /></div><Skeleton className="h-3 w-40" /></div><Skeleton className="h-3 w-14" /></header>
          <div className="px-5 py-5 sm:px-6 sm:py-6"><Skeleton className="h-3 w-36" /><div className="mt-4 flex h-36 items-end gap-2 border-b border-border/60 pl-7"><Skeleton className="h-7 flex-1 rounded-t-sm" /><Skeleton className="h-16 flex-1 rounded-t-sm" /><Skeleton className="h-10 flex-1 rounded-t-sm" /><Skeleton className="h-24 flex-1 rounded-t-sm" /><Skeleton className="h-12 flex-1 rounded-t-sm" /><Skeleton className="h-20 flex-1 rounded-t-sm" /><Skeleton className="h-9 flex-1 rounded-t-sm" /></div><div className="mt-2 grid grid-cols-7 gap-2 pl-7">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-3 w-full" />)}</div></div>
        </section>
      </div>
    </section>
  )
}

function MetricSkeleton() {
  return <div className="flex min-h-36 flex-col justify-between rounded-lg border border-border/70 bg-card p-4"><div className="flex items-start justify-between gap-3"><Skeleton className="h-3 w-28" /><Skeleton className="size-8 rounded-md" /></div><div className="space-y-2"><Skeleton className="h-8 w-12" /><Skeleton className="h-3 w-32" /></div></div>
}

function SignalSkeleton() {
  return <div className="space-y-1"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-7" /></div>
}

function ActivitySkeletonRow() {
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-5 py-4 sm:px-6"><div className="min-w-0 space-y-2"><div className="flex items-center gap-2.5"><Skeleton className="size-6 rounded-md" /><Skeleton className="h-4 w-full max-w-xs" /></div><Skeleton className="ml-9 h-3 w-44 max-w-[70%]" /></div><Skeleton className="h-3 w-14" /></div>
}
