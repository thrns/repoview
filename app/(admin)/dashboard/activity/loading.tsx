import { Skeleton } from '@/components/ui'

export default function ActivityLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-10 lg:px-10 lg:pb-14" aria-busy="true" aria-label="Loading activity">
      <div className="sticky top-14 z-30 -mx-6 bg-background/95 px-6 pb-4 pt-7 backdrop-blur-sm lg:top-0 lg:-mx-10 lg:px-10 lg:pb-5 lg:pt-10">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
          <Skeleton className="hidden h-4 w-32 sm:block" />
        </header>

        <div className="mt-5 flex items-center gap-2">
          <Skeleton className="h-9 w-full max-w-xs" />
          <div className="hidden flex-1 gap-2 lg:flex">
            {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-9 min-w-0 flex-1" />)}
          </div>
          <Skeleton className="h-9 w-20 lg:hidden" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-b border-border/70 pb-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-20" />
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
        {Array.from({ length: 4 }, (_, index) => <ActivitySessionSkeleton key={index} expanded={index < 2} />)}
      </div>
    </section>
  )
}

function ActivitySessionSkeleton({ expanded }: { expanded: boolean }) {
  return (
    <div className="border-b border-border/70 px-4 py-3.5 last:border-b-0 sm:px-5">
      <div className="flex items-stretch gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-3.5 rounded-full" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-3 w-56 max-w-[80%]" />
          <Skeleton className="h-3 w-44 max-w-[60%]" />
        </div>
        <Skeleton className="size-8 shrink-0 rounded-md" />
      </div>

      {expanded ? (
        <div className="mt-3 space-y-2 border-t border-border/50 bg-muted/20 px-3 py-2.5 sm:ml-9 sm:px-0">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-center gap-2 py-1.5">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-3.5 w-full max-w-md" />
              <Skeleton className="ml-auto h-3 w-12" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
