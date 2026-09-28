import { Skeleton } from '@/components/ui'

export default function SharesLoading() {
  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-7 sm:px-8 lg:px-10 lg:py-9" aria-busy="true" aria-label="Loading shares">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-7 sm:flex-row sm:items-end sm:justify-between"><div className="space-y-2"><Skeleton className="h-9 w-36" /><Skeleton className="h-4 w-72 max-w-full" /></div><div className="flex gap-3"><Skeleton className="h-3 w-20" /><Skeleton className="h-10 w-28" /></div></header>
      <section className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm"><div className="flex items-start justify-between gap-3 border-b border-border/70 bg-muted/18 px-4 py-4 sm:px-5"><div className="flex items-start gap-3"><Skeleton className="mt-0.5 size-8 rounded-md" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-80 max-w-full" /></div></div><Skeleton className="h-3 w-16" /></div><div className="space-y-3 bg-card px-4 py-4 sm:px-5"><div className="flex flex-col gap-2 sm:flex-row"><Skeleton className="h-10 w-full flex-1" /><Skeleton className="h-10 w-32" /><Skeleton className="h-3 w-20 sm:my-auto" /></div><Skeleton className="h-7 w-64 max-w-full" /></div><ul className="divide-y divide-border/70">{Array.from({ length: 5 }, (_, index) => <ShareRowSkeleton key={index} />)}</ul></section>
    </section>
  )
}
function ShareRowSkeleton() {
  return <li className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto_auto_auto_auto] sm:items-center sm:gap-4 sm:px-5"><div className="flex min-w-0 items-start gap-3 sm:col-span-2"><Skeleton className="size-8 shrink-0 rounded-md" /><div className="min-w-0 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-64 max-w-full" /><Skeleton className="h-3 w-28" /></div></div><Skeleton className="h-6 w-20 rounded-md" /><div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-20" /></div><Skeleton className="h-3 w-20" /><Skeleton className="size-9 rounded-md" /></li>
}
