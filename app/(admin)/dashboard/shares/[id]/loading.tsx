import { Skeleton } from '@/components/ui'

export default function ShareDetailLoading() {
  return (
    <section className="mx-auto w-full max-w-[1180px] px-5 py-6 sm:px-8 lg:px-10 lg:py-10" aria-busy="true" aria-label="Loading share detail">
      <Skeleton className="h-3 w-24" />

      <div className="mt-7 overflow-hidden rounded-md border border-border/70 bg-card">
        <header className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5"><Skeleton className="h-8 w-64 max-w-full" /><Skeleton className="h-6 w-20 rounded-full" /></div>
            <div className="flex flex-wrap items-center gap-2"><Skeleton className="h-6 w-40 rounded-md" /><Skeleton className="h-6 w-28 rounded-md" /></div>
          </div>
          <div className="flex items-center gap-2"><Skeleton className="h-9 w-24" /><Skeleton className="size-9 rounded-md" /></div>
        </header>
        <div className="border-t border-border/60 bg-muted/18 px-3 py-3 sm:px-4"><div className="grid grid-cols-2 gap-2 md:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-lg border border-border/55 bg-card/75 px-3 py-3"><Skeleton className="h-6 w-6 rounded-md" /><Skeleton className="mt-2 h-4 w-24 max-w-full" /></div>)}</div></div>
      </div>

      <div className="mt-8 space-y-8">
        <ShareDetailSectionSkeleton rows={4} />
        <ShareDetailSectionSkeleton rows={3} />
        <div className="overflow-hidden rounded-md border border-border/70 bg-card"><div className="flex items-center gap-3 px-5 py-4 sm:px-6"><Skeleton className="size-8 rounded-lg" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-56 max-w-full" /></div><Skeleton className="ml-auto size-4 rounded-full" /></div></div>
      </div>
    </section>
  )
}

function ShareDetailSectionSkeleton({ rows }: { rows: number }) {
  return (
    <section className="overflow-hidden rounded-md border border-border/70 bg-card">
      <div className="flex items-center gap-3 border-b border-border/55 px-5 py-4 sm:px-6"><Skeleton className="size-8 rounded-lg" /><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-48 max-w-full" /></div></div>
      <div className="space-y-1 px-2 py-2 sm:px-3">{Array.from({ length: rows }, (_, index) => <div key={index} className="space-y-3 rounded-lg px-3 py-3.5"><div className="flex items-center justify-between gap-3"><Skeleton className="h-6 w-24 rounded-full" /><Skeleton className="size-4 rounded-full" /></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div></div>)}</div>
    </section>
  )
}
