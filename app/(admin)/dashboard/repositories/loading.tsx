import { Skeleton } from '@/components/ui'

export default function RepositoriesLoading() {
  return (
    <section className="mx-auto flex min-h-0 w-full min-w-0 max-w-[1400px] flex-1 flex-col gap-6 px-5 py-7 sm:px-8 lg:px-10 lg:py-9" aria-busy="true" aria-label="Loading repositories">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2"><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-full max-w-2xl" /></div>
        <Skeleton className="h-3 w-24" />
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-border/70 bg-muted/18 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3"><Skeleton className="mt-0.5 size-8 rounded-md" /><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-72 max-w-full" /></div></div>
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="space-y-3 bg-card px-4 py-4 sm:px-5"><div className="flex flex-col gap-2 sm:flex-row"><Skeleton className="h-10 w-full flex-1" /><Skeleton className="h-10 w-32" /><Skeleton className="h-3 w-20 sm:my-auto" /></div><Skeleton className="h-7 w-64 max-w-full" /></div>
        <div className="flex items-center justify-between gap-3 border-y border-border/70 bg-muted/20 px-4 py-2.5 sm:px-5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-44" /></div>
        <ul className="min-h-0 flex-1 divide-y divide-border/70 overflow-hidden">{Array.from({ length: 7 }, (_, index) => <RepositoryRowSkeleton key={index} />)}</ul>
      </div>

      <footer><Skeleton className="h-3 w-96 max-w-full" /></footer>
    </section>
  )
}
function RepositoryRowSkeleton() {
  return <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-5"><Skeleton className="size-4" /><div className="flex min-w-0 items-start gap-3"><Skeleton className="size-8 shrink-0 rounded-md" /><div className="min-w-0 space-y-2"><Skeleton className="h-4 w-56 max-w-full" /><Skeleton className="h-3 w-72 max-w-full" /><Skeleton className="h-5 w-52 max-w-full rounded-md" /></div></div><div className="col-span-2 flex gap-2 sm:col-span-1 sm:flex-col"><Skeleton className="h-9 w-32" /><Skeleton className="h-9 w-16" /></div></li>
}
