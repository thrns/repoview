import { Skeleton } from '@/components/ui'

export default function ViewerFileLoading() {
  return (
    <section className="repository-file-page min-h-[calc(100vh-5rem)]" aria-busy="true" aria-label="Loading file preview">
      <div className="border-b border-border px-3 py-3 sm:px-5"><Skeleton className="h-4 w-72 max-w-full" /></div>
      <div className="source-code space-y-2 p-6 sm:p-8">{Array.from({ length: 12 }, (_, index) => <Skeleton key={index} className="h-4 w-full" />)}</div>
    </section>
  )
}
