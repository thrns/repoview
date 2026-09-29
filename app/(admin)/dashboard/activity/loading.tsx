import { PageContainer, Skeleton } from '@/components/ui'

export default function ActivityLoading() {
  return (
    <PageContainer size="default" className="space-y-5 pb-10 lg:pb-14" aria-busy="true" aria-label="Loading activity">
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/75 p-2"><Skeleton className="h-10 w-full max-w-sm" /><Skeleton className="h-10 w-32" /></div>
      </div>

      <div className="overflow-hidden rounded-md border border-border/70 bg-card"><div className="flex items-start justify-between gap-3 border-b border-border/70 bg-muted/18 px-4 py-4 sm:px-5"><div className="flex items-start gap-3"><Skeleton className="mt-0.5 size-8 rounded-md" /><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-80 max-w-full" /></div></div><Skeleton className="h-3 w-28" /></div>{Array.from({ length: 4 }, (_, index) => <ActivitySessionSkeleton key={index} expanded={index < 2} />)}</div>
    </PageContainer>
  )
}
function ActivitySessionSkeleton({ expanded }: { expanded: boolean }) {
  return <div className="border-b border-border/70 px-3 py-3 last:border-b-0 sm:px-4 sm:py-3.5"><div className="flex items-stretch gap-3"><Skeleton className="size-8 shrink-0 rounded-md" /><div className="min-w-0 flex-1 space-y-2"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-4 w-28" /></div><Skeleton className="h-3 w-16" /></div><Skeleton className="h-3 w-56 max-w-[80%]" /><Skeleton className="h-3 w-44 max-w-[60%]" /></div><Skeleton className="size-8 shrink-0 rounded-md" /></div>{expanded ? <div className="mx-0 mt-3 space-y-2 rounded-lg border border-border-secondary bg-surface-200/30 px-4 py-3 sm:ml-9"><div className="grid gap-3 border-b border-border/50 pb-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-3 w-24" />)}</div>{Array.from({ length: 3 }, (_, index) => <div key={index} className="flex items-center gap-2 py-1.5"><Skeleton className="size-5 rounded-full" /><Skeleton className="h-3.5 w-full max-w-md" /><Skeleton className="ml-auto h-3 w-12" /></div>)}</div> : null}</div>
}
