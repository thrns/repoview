import { Skeleton } from '@/components/ui'

export default function DashboardLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-7 px-5 py-7 sm:px-8 lg:px-10 lg:py-9" aria-busy="true" aria-label="Loading dashboard">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56 max-w-full" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <div className="flex items-center gap-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-10 w-28" /></div>
      </header>

      <div className="border-y border-border/70 py-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-border/60">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2 lg:px-5 first:pl-0 last:pr-0"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-20" /></div>)}
        </div>
        <Skeleton className="mt-4 h-3 w-96 max-w-full" />
      </div>

      <section className="overflow-hidden border-b border-border/70">
        <header className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-4"><div className="space-y-2"><Skeleton className="h-6 w-36" /><Skeleton className="h-4 w-72 max-w-full" /></div><Skeleton className="h-4 w-28" /></header>
        <div className="space-y-0">{Array.from({ length: 5 }, (_, index) => <ActivitySkeletonRow key={index} />)}</div>
      </section>

      <div className="border-b border-border/60 pb-4"><Skeleton className="h-4 w-44" /></div>
    </section>
  )
}

function ActivitySkeletonRow() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-border/60 py-3 last:border-b-0">
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
