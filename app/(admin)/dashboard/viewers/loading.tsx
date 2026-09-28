import { PageContainer, Skeleton } from '@/components/ui'

export default function ViewersLoading() {
  return (
    <PageContainer size="default" className="space-y-7" aria-busy="true" aria-label="Loading viewers">
      <header className="space-y-2 border-b border-border/60 pb-7"><Skeleton className="h-9 w-36" /><Skeleton className="h-4 w-full max-w-2xl" /></header>
      <div className="flex max-w-3xl items-start gap-2.5 rounded-lg border border-border/70 bg-card/70 px-3 py-2.5"><Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" /><Skeleton className="h-4 w-full max-w-xl" /></div>
      <section className="overflow-hidden rounded-md border border-border/70 bg-card"><div className="flex items-start justify-between gap-3 border-b border-border/70 bg-muted/18 px-4 py-4 sm:px-5"><div className="flex items-start gap-3"><Skeleton className="mt-0.5 size-8 rounded-md" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-80 max-w-full" /></div></div><Skeleton className="h-3 w-16" /></div><div className="space-y-3 bg-card px-4 py-4 sm:px-5"><div className="flex flex-col gap-2 sm:flex-row"><Skeleton className="h-10 w-full flex-1" /><Skeleton className="h-10 w-32" /><Skeleton className="h-3 w-20 sm:my-auto" /></div><Skeleton className="h-7 w-48 max-w-full" /></div><ul className="divide-y divide-border/70">{Array.from({ length: 6 }, (_, index) => <ViewerRowSkeleton key={index} />)}</ul></section>
    </PageContainer>
  )
}
function ViewerRowSkeleton() {
  return <li className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(12rem,1fr)_minmax(10rem,.8fr)_auto] sm:items-center sm:gap-5 sm:px-5"><div className="flex items-start gap-3"><Skeleton className="size-8 shrink-0 rounded-md" /><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-44" /><Skeleton className="h-3 w-52" /></div></div><div className="grid grid-cols-2 gap-4 sm:block"><Skeleton className="h-3 w-16" /><Skeleton className="mt-4 h-3 w-20" /></div><div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-24" /></div><div className="flex gap-2"><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-16" /></div></li>
}
