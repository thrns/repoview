import { Skeleton } from '@/components/ui'

export default function ShareDetailLoading() {
  return (
    <section className="mx-auto w-full max-w-[1180px] space-y-7 px-5 py-6 sm:px-8 lg:px-10 lg:py-10" aria-busy="true" aria-label="Loading share detail">
      <Skeleton className="h-4 w-28" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-80 max-w-full" /></div><Skeleton className="h-9 w-28" /></div>
      <Skeleton className="h-16 w-full" />
      <div className="space-y-3 pt-5"><Skeleton className="h-5 w-40" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
      <Skeleton className="h-14 w-full" />
    </section>
  )
}
