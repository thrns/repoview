import { Skeleton } from '@/components/ui'

export default function ShareDetailLoading() {
  return (
    <section className="mx-auto w-full max-w-[1180px] space-y-7 px-5 py-6 sm:px-8 lg:px-10 lg:py-10" aria-busy="true" aria-label="Loading share detail">
      <Skeleton className="h-3 w-24" />

      <header className="mt-1 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2.5"><Skeleton className="h-8 w-64 max-w-full" /><Skeleton className="h-6 w-20 rounded-full" /></div>
          <div className="flex flex-wrap items-center gap-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-3" /><Skeleton className="h-4 w-28" /></div>
        </div>
        <div className="flex items-center gap-2"><Skeleton className="h-9 w-24" /><Skeleton className="size-9 rounded-md" /></div>
      </header>

      <section className="mt-3 border-y border-border/60 py-4">
        <div className="flex flex-wrap gap-x-10 gap-y-4 sm:gap-x-14">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="min-w-[7rem] space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-24" /></div>)}
        </div>
      </section>

      <div className="space-y-14 pt-5">
        <ShareDetailSectionSkeleton rows={4} />
        <ShareDetailSectionSkeleton rows={3} />
        <div className="border-y border-border/60 py-4"><div className="flex items-center justify-between gap-4"><Skeleton className="h-5 w-32" /><Skeleton className="size-4 rounded-full" /></div></div>
      </div>
    </section>
  )
}

function ShareDetailSectionSkeleton({ rows }: { rows: number }) {
  return (
    <section>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"><Skeleton className="h-5 w-36" /><Skeleton className="h-3 w-40" /></div>
      <div className="mt-5 overflow-hidden border-y border-border/60">
        <div className="grid grid-cols-[minmax(13rem,1.6fr)_minmax(9rem,1fr)_minmax(6rem,.7fr)_minmax(7rem,.8fr)] gap-4 px-4 pb-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-16" /></div>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="grid min-h-14 grid-cols-[minmax(13rem,1.6fr)_minmax(9rem,1fr)_minmax(6rem,.7fr)_minmax(7rem,.8fr)] items-center gap-4 border-t border-border/55 px-4 py-3">
            <div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-48 max-w-full" /></div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </section>
  )
}
