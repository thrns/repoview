import { Card, CardContent, CardFooter, PageContainer, PageSection, PageSectionContent, PageSectionMeta, PageSectionSummary, Skeleton } from '@/components/ui'

export default function NewShareLoading() {
  return (
    <PageContainer size="medium" aria-busy="true" aria-label="Loading new share form">
      <div className="mb-4"><Skeleton className="h-3 w-24" /></div>

      <div className="space-y-0 pb-8">
        <FormSectionSkeleton fields={2} />
        <FormSectionSkeleton fields={2} optional />
        <FormSectionSkeleton fields={1} toggles={2} />
        <FormSectionSkeleton fields={2} />

        <Card className="mt-6">
          <CardFooter className="flex-col items-start gap-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-28" />
            </div>
          </CardFooter>
        </Card>
      </div>
    </PageContainer>
  )
}

function FormSectionSkeleton({ fields, optional = false, toggles = 0 }: { fields: number; optional?: boolean; toggles?: number }) {
  return (
    <PageSection className="gap-3 pb-0 pt-6 first:pt-0">
      <PageSectionMeta>
        <PageSectionSummary className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </PageSectionSummary>
      </PageSectionMeta>
      <PageSectionContent>
        <Card>
          {Array.from({ length: fields }, (_, index) => (
            <CardContent key={index} className={index === 0 ? 'pt-5' : undefined}>
              <div className="grid gap-3 md:grid-cols-2 md:items-start">
                <div className="order-2 space-y-2 md:order-1"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-64 max-w-full" /></div>
                <Skeleton className="order-1 h-10 w-full md:order-2" />
              </div>
            </CardContent>
          ))}
          {optional ? <CardContent className="py-3.5"><div className="flex items-center justify-between"><Skeleton className="h-4 w-40" /><Skeleton className="size-4 rounded-full" /></div></CardContent> : null}
          {toggles > 0 ? Array.from({ length: toggles }, (_, index) => (
            <CardContent key={`toggle-${index}`} className="flex items-center justify-between gap-5">
              <div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-72 max-w-full" /></div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </CardContent>
          )) : null}
        </Card>
      </PageSectionContent>
    </PageSection>
  )
}
