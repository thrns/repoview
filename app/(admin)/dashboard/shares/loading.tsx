import { Skeleton } from '@/components/ui'

export default function SharesLoading() {
  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-7 sm:px-8 lg:px-10 lg:py-9" aria-busy="true" aria-label="Loading shares">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between"><div className="space-y-2"><Skeleton className="h-9 w-36" /><Skeleton className="h-4 w-72 max-w-full" /></div><div className="flex gap-3"><Skeleton className="h-3 w-20" /><Skeleton className="h-10 w-28" /></div></header>
      <section><div className="flex flex-col gap-2 border-b border-border/70 pb-4 sm:flex-row"><Skeleton className="h-10 w-full flex-1" /><Skeleton className="h-10 w-32" /><Skeleton className="h-3 w-20 sm:my-auto" /></div><ul className="divide-y divide-border/70 border-y border-border/70">{Array.from({ length: 7 }, (_, index) => <ShareRowSkeleton key={index} />)}</ul></section>
    </section>
  )
}

function ShareRowSkeleton() {
  return <li className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto_auto_auto_auto] sm:items-center sm:gap-4"><div className="space-y-2 sm:col-span-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-64 max-w-full" /><Skeleton className="h-3 w-28" /></div><Skeleton className="h-6 w-20 rounded-md" /><div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-20" /></div><Skeleton className="h-3 w-20" /><Skeleton className="size-9 rounded-md" /></li>
}
