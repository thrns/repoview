import { Card, CardContent, CardHeader, Skeleton } from '@/components/ui'

export default function ShareDetailLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading share detail">
      <Skeleton className="h-4 w-28" />
      <div className="space-y-3"><Skeleton className="h-9 w-64" /><Skeleton className="h-4 w-80 max-w-full" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)}</div>
      <div className="grid gap-6 xl:grid-cols-2">{Array.from({ length: 2 }, (_, index) => <Card key={index}><CardHeader><Skeleton className="h-5 w-40" /></CardHeader><CardContent><Skeleton className="h-28 w-full" /></CardContent></Card>)}</div>
    </div>
  )
}
