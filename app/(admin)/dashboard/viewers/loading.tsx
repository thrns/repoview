import { Skeleton } from '@/components/ui'

export default function ViewersLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-8 lg:px-10 lg:py-9" aria-busy="true" aria-label="Loading viewers">
      <header className="space-y-2 border-b border-border/70 pb-6"><Skeleton className="h-9 w-36" /><Skeleton className="h-4 w-full max-w-2xl" /></header>
      <div className="mt-5 flex max-w-3xl items-start gap-2"><Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" /><Skeleton className="h-4 w-full max-w-xl" /></div>
      <section className="mt-7"><div className="flex flex-col gap-2 border-b border-border/70 pb-4 sm:flex-row"><Skeleton className="h-10 w-full flex-1" /><Skeleton className="h-10 w-32" /><Skeleton className="h-3 w-20 sm:my-auto" /></div><ul className="divide-y divide-border/70 border-y border-border/70">{Array.from({ length: 6 }, (_, index) => <ViewerRowSkeleton key={index} />)}</ul></section>
    </section>
  )
}

function ViewerRowSkeleton() {
  return <li className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(12rem,1fr)_minmax(10rem,.8fr)_auto] sm:items-center sm:gap-5"><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-44" /><Skeleton className="h-3 w-52" /></div><div className="grid grid-cols-2 gap-4 sm:block"><Skeleton className="h-3 w-16" /><Skeleton className="mt-4 h-3 w-20" /></div><div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-24" /></div><div className="flex gap-2"><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-16" /></div></li>
}
