import { PageContainer, Skeleton } from '@/components/ui'

export default function DashboardLoading() {
  return (
    <PageContainer size="default" className="space-y-4 sm:space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => <MetricSkeleton key={index} />)}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]" aria-hidden="true">
        <PanelSkeleton className="min-h-56" />
        <PanelSkeleton className="min-h-56" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        <PanelSkeleton className="min-h-72" />
        <PanelSkeleton className="min-h-72" />
        <PanelSkeleton className="min-h-72" />
      </div>
    </PageContainer>
  )
}

function MetricSkeleton() {
  return <div className="flex min-h-32 flex-col justify-between rounded-lg border border-border bg-card p-4"><div className="flex items-center gap-2.5"><Skeleton className="size-8 rounded-md" /><Skeleton className="h-3 w-28" /></div><div className="space-y-2"><Skeleton className="h-7 w-12" /><Skeleton className="h-3 w-32" /></div></div>
}

function PanelSkeleton({ className = '' }: { className?: string }) {
  return <section className={`overflow-hidden rounded-lg border border-border bg-card ${className}`}><div className="flex items-start justify-between gap-3 border-b border-border-secondary px-4 py-3.5 sm:px-5"><div className="flex items-start gap-2.5"><Skeleton className="size-8 rounded-md" /><div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-48 max-w-full" /></div></div><Skeleton className="h-7 w-20" /></div><div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4 sm:p-5"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div></section>
}
