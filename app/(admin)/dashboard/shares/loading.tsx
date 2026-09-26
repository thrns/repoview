import { Skeleton } from '@/components/ui'

export default function SharesLoading() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-5 py-6 sm:px-8 lg:px-10 lg:py-7" aria-busy="true" aria-label="Loading shares">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2"><Skeleton className="h-9 w-36" /><Skeleton className="h-4 w-72 max-w-full" /></div>
        <Skeleton className="h-9 w-28" />
      </header>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 px-0.5"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-20" /></div>
        <div className="mt-2 flex flex-wrap items-center gap-2 border-y border-border/70 py-2">
          <Skeleton className="h-8 w-full flex-1 basis-full sm:basis-56" />
          <div className="hidden gap-2 lg:flex">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-8 w-24" />)}</div>
          <Skeleton className="h-8 w-20 lg:hidden" />
          <Skeleton className="h-8 w-16" />
        </div>

        <div className="mt-3 overflow-hidden rounded-sm border border-border/70 bg-background">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[27%_30%_14%_15%_12%_3rem] gap-0 border-b border-border/70 px-4 py-2.5"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-16" /><Skeleton className="ml-auto h-3 w-16" /><Skeleton className="ml-auto h-3 w-12" /><Skeleton className="h-3 w-3" /></div>
            {Array.from({ length: 7 }, (_, index) => <ShareRowSkeleton key={index} />)}
          </div>
        </div>
      </div>
    </section>
  )
}

function ShareRowSkeleton() {
  return (
    <div className="grid min-w-[860px] grid-cols-[27%_30%_14%_15%_12%_3rem] items-center gap-0 border-b border-border/70 px-4 py-3 last:border-b-0">
      <div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-28" /></div>
      <div className="space-y-2"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-24" /></div>
      <Skeleton className="h-6 w-20 rounded-full" />
      <div className="ml-auto space-y-2 text-right"><Skeleton className="ml-auto h-4 w-12" /><Skeleton className="ml-auto h-3 w-16" /></div>
      <Skeleton className="ml-auto h-3 w-16" />
      <Skeleton className="ml-auto size-8 rounded-md" />
    </div>
  )
}
