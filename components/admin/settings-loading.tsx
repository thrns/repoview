import { Card, CardContent, CardFooter, PageSection, PageSectionContent, PageSectionMeta, PageSectionSummary, Skeleton } from '@/components/ui'

export function SettingsPageLoading({ cards }: { cards: Array<{ rows: number; footer?: boolean }> }) {
  return (
    <div aria-busy="true" aria-label="Loading settings">
      <PageSection>
        <PageSectionMeta>
          <PageSectionSummary>
            <div className="h-6 w-28"><Skeleton className="h-full w-full" /></div>
            <div className="h-4 w-full max-w-xl"><Skeleton className="h-full w-full" /></div>
          </PageSectionSummary>
        </PageSectionMeta>
        <PageSectionContent>
          <div className="space-y-4">
            {cards.map((card, cardIndex) => (
              <Card key={cardIndex}>
                {Array.from({ length: card.rows }, (_, rowIndex) => <SettingsRowSkeleton key={rowIndex} first={rowIndex === 0} />)}
                {card.footer ? <CardFooter className="justify-end"><Skeleton className="h-9 w-32" /></CardFooter> : null}
              </Card>
            ))}
          </div>
        </PageSectionContent>
      </PageSection>
    </div>
  )
}

function SettingsRowSkeleton({ first }: { first: boolean }) {
  return (
    <CardContent className={first ? 'pt-6' : undefined}>
      <div className="relative flex flex-col-reverse gap-2 md:flex-row-reverse md:items-start md:justify-between md:gap-6">
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
