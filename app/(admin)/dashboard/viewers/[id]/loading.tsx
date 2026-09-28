import { Skeleton } from '@/components/ui'

export default function ViewerDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 px-5 py-7 sm:px-8 lg:px-10 lg:py-10" aria-busy="true" aria-label="Loading viewer detail">
      <Skeleton className="h-3 w-28" />

      <div className="overflow-hidden rounded-md border border-border/70 bg-card">
        <header className="flex flex-col justify-between gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-start"><div className="space-y-3"><div className="flex flex-wrap items-center gap-2"><Skeleton className="h-6 w-32 rounded-full" /><Skeleton className="h-6 w-20 rounded-full" /></div><Skeleton className="h-8 w-64 max-w-full" /><Skeleton className="h-4 w-64 max-w-full" /><Skeleton className="h-3 w-80 max-w-full" /></div><div className="space-y-2 rounded-lg border border-border-secondary bg-surface-200/35 px-4 py-3"><Skeleton className="h-6 w-8" /><Skeleton className="h-3 w-24" /></div></header>
        <div className="border-t border-border/60 bg-muted/18 px-3 py-3 sm:px-4"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-lg border border-border/55 bg-card/75 px-3.5 py-3"><Skeleton className="h-6 w-6 rounded-md" /><Skeleton className="mt-2 h-4 w-24 max-w-full" /></div>)}</div></div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border-secondary bg-surface-200/30 px-4 py-3.5"><Skeleton className="size-4 shrink-0 rounded-full" /><Skeleton className="h-4 w-full max-w-3xl" /></div>
      <div className="space-y-4"><div className="flex h-auto w-full flex-wrap gap-1 rounded-md border border-border/70 bg-card p-1.5">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-8 w-24" />)}</div><div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"><ViewerDetailCardSkeleton rows={4} /><ViewerDetailCardSkeleton rows={6} /></div></div>
    </div>
  )
}

function ViewerDetailCardSkeleton({ rows }: { rows: number }) {
  return <div className="rounded-md border border-border/70 bg-card"><div className="space-y-2 border-b border-border/55 px-5 py-5 sm:px-6"><Skeleton className="h-5 w-28" /><Skeleton className="h-3 w-full max-w-xs" /></div><div className="space-y-2 p-5 sm:p-6">{Array.from({ length: rows }, (_, index) => <div key={index} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/18 p-3.5"><Skeleton className="h-7 w-7 rounded-md" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3.5 w-44 max-w-full" /><Skeleton className="h-3 w-64 max-w-full" /></div></div>)}</div></div>
}
