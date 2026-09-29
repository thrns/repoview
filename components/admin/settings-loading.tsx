import { Card, CardContent, CardFooter, Skeleton } from '@/components/ui'

export function SettingsPageLoading({ cards }: { cards: Array<{ rows: number; footer?: boolean }> }) {
  return (
    <div className="space-y-4 py-7 lg:py-9" aria-busy="true" aria-label="Loading settings">
      {cards.map((card, cardIndex) => (
        <Card key={cardIndex}>
          {Array.from({ length: card.rows }, (_, rowIndex) => <SettingsRowSkeleton key={rowIndex} first={rowIndex === 0} />)}
          {card.footer ? <CardFooter className="justify-end"><Skeleton className="h-9 w-32" /></CardFooter> : null}
        </Card>
      ))}
    </div>
  )
}

function SettingsRowSkeleton({ first }: { first: boolean }) {
  return (
    <CardContent className={first ? 'pt-6' : undefined}>
      <div className="relative flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="flex min-w-0 grow flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <div className="flex w-full shrink-0 flex-col md:w-1/2 md:items-end xl:w-2/5">
          <Skeleton className="h-9 w-full max-w-xs" />
        </div>
      </div>
    </CardContent>
  )
}
