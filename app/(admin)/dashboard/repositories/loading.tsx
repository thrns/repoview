import { Skeleton } from '@/components/ui'

export default function RepositoriesLoading() {
  return (
    <section className="mx-auto flex min-h-0 w-full min-w-0 max-w-[1400px] flex-1 flex-col gap-6 px-5 py-7 sm:px-8 lg:px-10 lg:py-9" aria-busy="true" aria-label="Loading repositories">
      <header className="flex shrink-0 flex-col gap-5 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2"><Skeleton className="size-3.5 rounded-full" /><Skeleton className="h-3 w-44" /></div>
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <div className="flex items-center gap-2 sm:pb-1"><Skeleton className="h-3 w-16" /><Skeleton className="h-6 w-24 rounded-full" /></div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border/70 bg-card">
        <div className="shrink-0 border-b border-border/60 bg-muted/15 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Skeleton className="h-9 w-full flex-1" />
            <div className="flex gap-2"><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-40" /></div>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1"><Skeleton className="h-7 w-16" /><Skeleton className="h-7 w-24" /><Skeleton className="h-7 w-20" /><Skeleton className="h-7 w-20" /></div>
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="min-w-[1060px]">
            <div className="grid grid-cols-[2.5rem_29%_13%_12%_16%_17%_13%] items-center gap-0 border-b border-border/70 px-1 py-2.5">
              <Skeleton className="ml-3 size-4 rounded-sm" />
              {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="ml-2 h-3 w-20" />)}
            </div>
            {Array.from({ length: 6 }, (_, index) => <RepositoryRowSkeleton key={index} />)}
          </div>
        </div>
      </div>

      <footer className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><Skeleton className="h-3 w-96 max-w-full" /><Skeleton className="h-3 w-32" /></footer>
    </section>
  )
}

function RepositoryRowSkeleton() {
  return (
    <div className="grid min-w-[1060px] grid-cols-[2.5rem_29%_13%_12%_16%_17%_13%] items-center border-b border-border/60 px-1 py-3.5">
      <Skeleton className="ml-3 size-4 rounded-sm" />
      <div className="flex min-w-0 items-center gap-3 px-2">
        <Skeleton className="size-8 shrink-0 rounded-md" />
        <div className="min-w-0 space-y-2"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-44 max-w-full" /></div>
      </div>
      <Skeleton className="ml-2 h-3 w-20" />
      <Skeleton className="ml-2 h-6 w-16 rounded-full" />
      <Skeleton className="ml-2 h-6 w-20 rounded-full" />
      <div className="flex items-center gap-2 px-2"><Skeleton className="h-5 w-9 rounded-full" /><div className="space-y-2"><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-3 w-24" /></div></div>
      <Skeleton className="ml-2 h-3 w-28" />
    </div>
  )
}
