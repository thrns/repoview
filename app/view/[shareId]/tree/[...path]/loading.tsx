import { Skeleton } from '@/components/ui'

export default function ViewerDirectoryLoading() {
  return (
    <section className="repository-file-page min-h-[calc(100vh-3rem)]" aria-busy="true" aria-label="Loading README preview">
      <div className="flex min-h-12 items-center justify-between gap-4 border-b border-border px-3 py-2 sm:px-5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="mx-auto max-w-3xl space-y-5 px-5 py-10">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full" />
      </div>
    </section>
  )
}
