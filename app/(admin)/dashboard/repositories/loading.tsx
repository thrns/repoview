import { Skeleton } from '@/components/ui'

export default function RepositoriesLoading() {
  return (
    <section className="mx-auto flex min-h-0 w-full min-w-0 max-w-[1400px] flex-1 flex-col gap-6 px-5 py-7 sm:px-8 lg:px-10 lg:py-9" aria-busy="true" aria-label="Loading repositories">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between"><div className="space-y-2"><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-full max-w-2xl" /></div><Skeleton className="h-3 w-24" /></header>
      <div className="flex min-h-0 flex-1 flex-col"><div className="flex flex-col gap-2 border-b border-border/70 pb-4 sm:flex-row"><Skeleton className="h-10 w-full flex-1" /><Skeleton className="h-10 w-32" /><Skeleton className="h-3 w-20 sm:my-auto" /></div><div className="flex items-center justify-between border-b border-border/70 py-2.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-44" /></div><ul className="divide-y divide-border/70">{Array.from({ length: 7 }, (_, index) => <RepositoryRowSkeleton key={index} />)}</ul></div>
      <footer><Skeleton className="h-3 w-96 max-w-full" /></footer>
    </section>
  )
}

function RepositoryRowSkeleton() {
  return <li className="grid gap-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"><Skeleton className="size-4" /><div className="space-y-2"><Skeleton className="h-4 w-56 max-w-full" /><Skeleton className="h-3 w-72 max-w-full" /><Skeleton className="h-5 w-32 rounded-md" /></div><div className="flex gap-2"><Skeleton className="h-9 w-32" /><Skeleton className="h-9 w-16" /></div></li>
}
