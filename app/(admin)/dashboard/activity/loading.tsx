import { Card, CardContent, CardHeader, Skeleton } from '@/components/ui'

export default function ActivityLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading activity">
      <div className="space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-44" /><Skeleton className="h-4 w-full max-w-xl" /></div>
      <Card>
        <CardHeader><Skeleton className="h-9 w-64" /></CardHeader>
        <CardContent className="space-y-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}</CardContent>
      </Card>
    </div>
  )
}
