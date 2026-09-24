import { Card, CardContent, CardHeader, Skeleton } from '@/components/ui'

export default function SharesLoading() {
  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-5 px-5 py-7 sm:px-8 lg:px-10 lg:py-8" aria-busy="true" aria-label="Loading shares">
      <header className="flex items-end justify-between border-b border-border/70 pb-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </header>
      <div className="flex flex-col gap-3 border-y border-border/70 py-3 sm:flex-row">
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Card className="rounded-md border-border/70 shadow-none">
        <CardHeader className="space-y-3 p-4">
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          {Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    </section>
  )
}
