import { Skeleton } from '@/components/ui'

export default function ViewerDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 px-6 py-10 lg:px-10 lg:py-14" aria-busy="true" aria-label="Loading viewer detail">
      <Skeleton className="h-4 w-28" />
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="space-y-3"><div className="flex flex-wrap items-center gap-2"><Skeleton className="h-6 w-32 rounded-full" /><Skeleton className="h-6 w-20 rounded-full" /></div><Skeleton className="h-10 w-64 max-w-full" /><Skeleton className="h-4 w-64 max-w-full" /><Skeleton className="h-4 w-80 max-w-full" /></div>
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3"><Skeleton className="ml-auto h-5 w-20" /><Skeleton className="ml-auto h-3 w-32" /></div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-lg border border-border bg-card p-5"><Skeleton className="h-4 w-24" /><Skeleton className="mt-3 h-6 w-28" /></div>)}</div>
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4"><Skeleton className="size-4 shrink-0 rounded-full" /><Skeleton className="h-4 w-full max-w-3xl" /></div>
      <div className="space-y-6"><div className="flex h-auto w-full flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-8 w-24" />)}</div><div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><ViewerDetailCardSkeleton rows={4} /><ViewerDetailCardSkeleton rows={6} /></div></div>
    </div>
  )
}

function ViewerDetailCardSkeleton({ rows }: { rows: number }) {
  return <div className="rounded-lg border border-border bg-card"><div className="space-y-2 border-b border-border px-6 py-6"><Skeleton className="h-5 w-28" /><Skeleton className="h-3 w-full max-w-xs" /></div><div className="space-y-3 p-6">{Array.from({ length: rows }, (_, index) => <div key={index} className="flex items-center gap-3 rounded-lg border border-border p-4"><Skeleton className="h-4 w-6" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3.5 w-44 max-w-full" /><Skeleton className="h-3 w-64 max-w-full" /></div></div>)}</div></div>
}
