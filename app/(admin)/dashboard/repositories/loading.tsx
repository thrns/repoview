import { Card, CardContent, CardHeader, Skeleton } from '@/components/ui'

export default function RepositoriesLoading() {
  return (
    <section className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-7 sm:px-8 lg:px-10 lg:py-9" aria-label="Loading repositories">
      <div className="space-y-3 border-b border-border/70 pb-6">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Card className="overflow-hidden rounded-md border-border/70 shadow-none">
        <CardHeader className="border-b border-border/60 bg-muted/15 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-[4.5rem] w-full rounded-none border-b border-border/40" />
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
