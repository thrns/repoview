import { Skeleton } from '@/components/ui'

export default function SharesLoading() {
  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-7 sm:px-8 lg:px-10 lg:py-9" aria-busy="true" aria-label="Loading shares">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2"><Skeleton className="h-9 w-36" /><Skeleton className="h-4 w-72 max-w-full" /></div>
        <Skeleton className="h-3 w-20" />
      </header>
      <div className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center"><Skeleton className="h-10 w-full flex-1" /><div className="flex gap-2"><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-28" /></div></div>
        <Skeleton className="h-7 w-64 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-md border border-border bg-surface-100">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed text-sm">
            <caption className="sr-only">Loading repository shares</caption>
            <colgroup><col /><col className="w-[9rem]" /><col className="w-[10rem]" /><col className="w-[9rem]" /><col className="w-1" /></colgroup>
            <thead className="bg-surface-200/70"><tr className="border-b border-border-secondary"><th className="h-10 px-3"><Skeleton className="h-3 w-12" /></th><th className="h-10 px-3"><Skeleton className="h-3 w-14" /></th><th className="h-10 px-3"><Skeleton className="ml-auto h-3 w-20" /></th><th className="h-10 px-3"><Skeleton className="h-3 w-14" /></th><th className="h-10 px-3" /></tr></thead>
            <tbody>{Array.from({ length: 6 }, (_, index) => <ShareRowSkeleton key={index} />)}</tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function ShareRowSkeleton() {
  return <tr className="border-b border-border-secondary"><td className="px-3 py-3"><div className="space-y-2"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-64 max-w-full" /></div></td><td className="px-3 py-3"><Skeleton className="h-6 w-20 rounded-md" /></td><td className="px-3 py-3"><div className="ml-auto w-24 space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="ml-auto h-3 w-24" /></div></td><td className="px-3 py-3"><Skeleton className="h-3 w-16" /></td><td className="px-3 py-3"><Skeleton className="ml-auto size-9 rounded-md" /></td></tr>
}
