import { Card, Checkbox, PageContainer, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'

export default function RepositoriesLoading() {
  return (
    <PageContainer size="large" className="flex min-h-0 min-w-0 flex-1 flex-col gap-5" aria-busy="true" aria-label="Loading repositories">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2"><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-full max-w-2xl" /></div>
        <Skeleton className="h-3 w-24" />
      </header>

      <div className="space-y-3"><div className="flex flex-col gap-2 sm:flex-row"><Skeleton className="h-10 w-full max-w-xl flex-1" /><Skeleton className="h-10 w-32" /></div></div>

      <Card className="min-h-0 flex-1 overflow-hidden">
        <Table className="min-w-[820px] table-fixed">
          <caption className="sr-only">Loading repositories</caption>
          <colgroup><col className="w-11" /><col className="w-[42%]" /><col className="w-28" /><col className="w-36" /><col className="w-40" /><col className="w-20" /></colgroup>
          <TableHeader><TableRow><TableHead className="w-1"><Checkbox disabled aria-label="Select all visible repositories" /></TableHead><TableHead><Skeleton className="h-3 w-20" /></TableHead><TableHead><Skeleton className="h-3 w-16" /></TableHead><TableHead><Skeleton className="h-3 w-16" /></TableHead><TableHead><Skeleton className="h-3 w-12" /></TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
          <TableBody>{Array.from({ length: 7 }, (_, index) => <RepositoryRowSkeleton key={index} />)}</TableBody>
        </Table>
      </Card>

      <footer><Skeleton className="h-3 w-96 max-w-full" /></footer>
    </PageContainer>
  )
}

function RepositoryRowSkeleton() {
  return <TableRow><TableCell className="w-1 py-2"><Skeleton className="size-4" /></TableCell><TableCell className="py-2"><div className="flex items-center gap-2.5"><Skeleton className="size-4 shrink-0" /><div className="min-w-0 space-y-1"><Skeleton className="h-4 w-56 max-w-full" /><Skeleton className="h-3 w-72 max-w-full" /></div></div></TableCell><TableCell className="py-2"><Skeleton className="h-4 w-14" /></TableCell><TableCell className="py-2"><Skeleton className="h-6 w-16 rounded-md" /></TableCell><TableCell className="py-2"><Skeleton className="h-4 w-24" /></TableCell><TableCell className="w-1 py-2"><div className="flex justify-end gap-1"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></TableCell></TableRow>
}
