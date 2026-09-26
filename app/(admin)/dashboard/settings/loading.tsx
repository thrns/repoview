import { Skeleton } from '@/components/ui'

export default function SettingsLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-8 lg:px-10 lg:py-10" aria-busy="true" aria-label="Loading settings">
      <header className="border-b border-border/70 pb-7">
        <div className="flex flex-wrap items-center gap-2"><Skeleton className="h-6 w-28 rounded-full" /><Skeleton className="h-3 w-16" /></div>
        <Skeleton className="mt-3 h-10 w-44" />
        <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[168px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-3"><Skeleton className="h-3 w-16" /><div className="flex gap-1 overflow-hidden lg:block lg:space-y-1">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-8 w-28 shrink-0 lg:w-full" />)}</div></aside>
        <main className="min-w-0 space-y-5">
          <SettingsSectionSkeleton variant="account" />
          <SettingsSectionSkeleton variant="security" />
          <SettingsSectionSkeleton variant="github" />
          <SettingsSectionSkeleton variant="preferences" />
          <SettingsSectionSkeleton variant="privacy" />
        </main>
      </div>
    </section>
  )
}

function SettingsSectionSkeleton({ variant }: { variant: 'account' | 'security' | 'github' | 'preferences' | 'privacy' }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border/80 bg-card">
      <div className="flex items-start gap-3 border-b border-border/70 px-5 py-5 sm:px-6"><Skeleton className="size-8 shrink-0 rounded-md" /><div className="min-w-0 space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-80 max-w-full" /></div></div>
      <div className="space-y-5 px-5 py-5 sm:px-6"><SettingsSectionContent variant={variant} /></div>
    </section>
  )
}

function SettingsSectionContent({ variant }: { variant: 'account' | 'security' | 'github' | 'preferences' | 'privacy' }) {
  if (variant === 'account') return <><div className="grid gap-4 sm:grid-cols-2"><SettingsField /><SettingsField /></div><Skeleton className="h-9 w-28" /><div className="divide-y divide-border/70 rounded-md border border-border/70"><SettingsRow /><SettingsRow /></div></>
  if (variant === 'security') return <><div className="grid gap-3 sm:grid-cols-2"><SettingsCard /><SettingsCard /></div><div className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-muted/15 p-4"><div className="space-y-2"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-72 max-w-full" /></div><Skeleton className="h-8 w-28" /></div><div className="rounded-md border border-border/70"><div className="flex items-center justify-between border-b border-border/70 px-4 py-3"><Skeleton className="h-4 w-48" /><Skeleton className="size-4 rounded-full" /></div>{Array.from({ length: 3 }, (_, index) => <div key={index} className="flex items-center justify-between gap-4 border-b border-border/60 px-4 py-3 last:border-0"><div className="space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-56" /></div><Skeleton className="h-3 w-24" /></div>)}</div></>
  if (variant === 'github') return <><div className="rounded-md border border-border/70 p-4 sm:p-5"><div className="flex items-start gap-3"><Skeleton className="size-9 shrink-0 rounded-md" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div><Skeleton className="h-8 w-24" /></div><div className="mt-4 grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-3"><SettingsField /><SettingsField /><SettingsField /></div></div><div className="rounded-md border border-border/70 bg-muted/15 p-4"><Skeleton className="h-3 w-32" /><div className="mt-3 grid gap-3 sm:grid-cols-3"><SettingsField /><SettingsField /><SettingsField /></div></div></>
  if (variant === 'preferences') return <><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]"><SettingsField /><SettingsField /></div><div className="divide-y divide-border/60 rounded-md border border-border/70">{Array.from({ length: 5 }, (_, index) => <SettingsRow key={index} />)}</div><Skeleton className="h-9 w-32" /></>
  return <><div className="flex items-start gap-3 rounded-md border border-border/70 bg-muted/15 p-4"><Skeleton className="size-4 shrink-0 rounded-full" /><Skeleton className="h-4 w-full max-w-xl" /></div><div className="flex items-center justify-between gap-4 rounded-md border border-border/70 p-4"><div className="space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-72 max-w-full" /></div><Skeleton className="size-4 rounded-sm" /></div><div className="grid gap-4 sm:grid-cols-2"><SettingsField /><SettingsField /></div><Skeleton className="h-9 w-36" /></>
}

function SettingsField() { return <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-9 w-full" /><Skeleton className="h-3 w-40 max-w-full" /></div> }
function SettingsRow() { return <div className="flex items-center justify-between gap-4 px-4 py-3.5"><div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-64 max-w-full" /></div><Skeleton className="size-4 rounded-sm" /></div> }
function SettingsCard() { return <div className="rounded-md border border-border/70 p-4"><div className="flex items-start gap-3"><Skeleton className="size-4 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><div className="flex justify-between gap-3"><Skeleton className="h-4 w-44" /><Skeleton className="h-3 w-20" /></div><Skeleton className="h-3 w-56 max-w-full" /></div></div></div> }
