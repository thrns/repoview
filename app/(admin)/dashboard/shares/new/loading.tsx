import { Skeleton } from '@/components/ui'

export default function NewShareLoading() {
  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-7 sm:px-8 lg:py-9" aria-busy="true" aria-label="Loading new share form">
      <header className="mb-8 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </header>

      <div className="space-y-9 pb-28">
        <FormSectionSkeleton fields={2} />
        <FormSectionSkeleton fields={2} optional />
        <FormSectionSkeleton fields={1} toggles={2} />

        <section className="border-t border-border/70 pt-6">
          <div className="flex items-center justify-between gap-3"><div className="space-y-2"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-64 max-w-full" /></div><Skeleton className="size-4 rounded-full" /></div>
        </section>

        <div className="sticky bottom-0 z-10 -mx-5 border-t border-border/80 bg-background/95 px-5 py-3 sm:-mx-8 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-64 max-w-full" /></div><div className="flex justify-end gap-2"><Skeleton className="h-9 w-16" /><Skeleton className="h-9 w-28" /></div></div>
        </div>
      </div>
    </section>
  )
}

function FormSectionSkeleton({ fields, optional = false, toggles = 0 }: { fields: number; optional?: boolean; toggles?: number }) {
  return (
    <section className="border-t border-border/70 pt-6">
      <div className="mb-4 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-72 max-w-full" /></div>
      <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: fields }, (_, index) => <div key={index} className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-9 w-full" /></div>)}</div>
      {optional ? <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4"><Skeleton className="h-4 w-40" /><Skeleton className="size-4 rounded-full" /></div> : null}
      {toggles > 0 ? <div className="mt-4 divide-y divide-border/70 border-y border-border/70">{Array.from({ length: toggles }, (_, index) => <div key={index} className="flex min-h-[68px] items-center justify-between gap-5"><div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-72 max-w-full" /></div><Skeleton className="h-5 w-9 rounded-full" /></div>)}</div> : null}
    </section>
  )
}
