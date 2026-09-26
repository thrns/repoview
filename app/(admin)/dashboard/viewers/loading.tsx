import { Skeleton } from '@/components/ui'

export default function ViewersLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10 lg:py-10" aria-busy="true" aria-label="Loading viewers">
      <header className="space-y-2"><div className="flex items-baseline gap-3"><Skeleton className="h-10 w-36" /><Skeleton className="h-3 w-32" /></div><Skeleton className="h-4 w-full max-w-2xl" /></header>
      <div className="mt-5 flex max-w-3xl items-start gap-2"><Skeleton className="mt-0.5 size-3.5 shrink-0 rounded-full" /><Skeleton className="h-4 w-full max-w-xl" /></div>

      <section className="mt-7" aria-label="Loading viewer list">
        <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between"><Skeleton className="h-3 w-16" /><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><Skeleton className="h-8 w-full sm:w-56" /><Skeleton className="h-8 w-full sm:w-36" /></div></div>
        <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
          <div className="min-w-[920px]"><div className="grid grid-cols-[26%_18%_10%_14%_16%_12%_3rem] gap-0 border-b border-border px-3 py-2.5">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="ml-1 h-3 w-16" />)}</div>{Array.from({ length: 6 }, (_, index) => <ViewerRowSkeleton key={index} />)}</div>
        </div>
      </section>
    </section>
  )
}

function ViewerRowSkeleton() {
  return <div className="grid min-w-[920px] grid-cols-[26%_18%_10%_14%_16%_12%_3rem] items-center gap-0 border-b border-border/60 px-3 py-3.5 last:border-0"><div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-16" /></div><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div><Skeleton className="h-4 w-8" /><Skeleton className="h-3 w-16" /><div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-32" /></div><div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-12" /></div><Skeleton className="ml-auto size-8 rounded-md" /></div>
}
