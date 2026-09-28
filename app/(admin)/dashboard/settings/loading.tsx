import { PageContainer, Skeleton } from '@/components/ui'

export default function SettingsLoading() {
  return (
    <PageContainer size="large" className="overflow-x-hidden lg:py-10" aria-busy="true" aria-label="Loading settings">
      <header className="flex flex-col gap-6 border-b border-border/70 pb-7 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-2xl space-y-3">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <div className="flex gap-6 border-t border-border/60 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-28" /></div>
          <div className="space-y-2"><Skeleton className="h-3 w-8" /><Skeleton className="h-4 w-14" /></div>
        </div>
      </header>

      <div className="mt-6 min-w-0 space-y-5">
        <SettingsSectionSkeleton variant="account" />
        <SettingsSectionSkeleton variant="security" />
        <SettingsSectionSkeleton variant="github" />
        <SettingsSectionSkeleton variant="notifications" />
        <SettingsSectionSkeleton variant="privacy" />
      </div>
    </PageContainer>
  )
}

function SettingsSectionSkeleton({ variant }: { variant: 'account' | 'security' | 'github' | 'notifications' | 'privacy' }) {
  return (
    <section className="overflow-hidden rounded-md border border-border bg-surface-100">
      <div className="flex items-start gap-3 border-b border-border/70 p-5 sm:p-6">
        <Skeleton className="mt-0.5 size-4 shrink-0 rounded-sm" />
        <div className="min-w-0 space-y-2"><Skeleton className="h-5 w-28" /><Skeleton className="h-3 w-80 max-w-full" /></div>
      </div>
      <div className="space-y-7 p-5 sm:p-6"><SettingsSectionContent variant={variant} /></div>
    </section>
  )
}

function SettingsSectionContent({ variant }: { variant: 'account' | 'security' | 'github' | 'notifications' | 'privacy' }) {
  if (variant === 'account') {
    return <><div className="space-y-3.5"><SubsectionHeadingSkeleton /><div className="grid gap-5 sm:grid-cols-2"><FieldSkeleton /><FieldSkeleton /></div><FooterSkeleton /></div><div className="border-t border-border/60 pt-7"><SettingsSubsectionSkeleton rows={2} /></div><div className="border-t border-border/60 pt-7"><SettingsSubsectionSkeleton rows={1} /></div></>
  }

  if (variant === 'security') {
    return <><SettingsSubsectionSkeleton rows={3} actionRows /><div className="border-t border-border/60 pt-7"><SettingsSubsectionSkeleton rows={4} actionRows /></div></>
  }

  if (variant === 'github') {
    return <><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><Skeleton className="size-8 rounded-md" /><Skeleton className="h-5 w-36" /></div><div className="flex gap-2"><Skeleton className="h-9 w-24" /><Skeleton className="size-9" /></div></div><div className="grid gap-4 border-y border-border/60 py-4 sm:grid-cols-3"><MetricSkeleton /><MetricSkeleton /><MetricSkeleton /></div><div className="flex justify-end"><Skeleton className="h-4 w-44" /></div><div className="border-t border-border/60 pt-7"><SubsectionHeadingSkeleton /><div className="grid gap-4 rounded-md border border-border-secondary bg-surface-200/45 p-4 sm:grid-cols-3"><MetricSkeleton /><MetricSkeleton /><MetricSkeleton /></div></div></>
  }

  if (variant === 'notifications') {
    return <><div className="space-y-3.5"><SubsectionHeadingSkeleton /><div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)]"><FieldSkeleton /><FieldSkeleton /></div></div><div className="border-t border-border/60 pt-7"><SettingsSubsectionSkeleton rows={5} actionRows /></div><FooterSkeleton /></>
  }

  return <><Skeleton className="h-16 w-full rounded-md" /><SettingsSubsectionSkeleton rows={2} actionRows /><FooterSkeleton /><div className="flex justify-end border-t border-border/60 pt-5"><Skeleton className="h-4 w-80 max-w-full" /></div></>
}

function SettingsSubsectionSkeleton({ rows = 2, actionRows = false }: { rows?: number; actionRows?: boolean }) {
  return <div className="space-y-3.5"><SubsectionHeadingSkeleton /><div className="divide-y divide-border/60 border-y border-border/60">{Array.from({ length: rows }, (_, index) => <div key={index} className="grid min-h-16 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8"><div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-64 max-w-full" /></div><Skeleton className={actionRows ? 'h-6 w-16' : 'h-6 w-12'} /></div>)}</div></div>
}

function SubsectionHeadingSkeleton() {
  return <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-72 max-w-full" /></div>
}

function FieldSkeleton() {
  return <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-full" /></div>
}

function FooterSkeleton() {
  return <div className="mt-7 flex justify-end border-t border-border/60 pt-5"><Skeleton className="h-9 w-32" /></div>
}

function MetricSkeleton() {
  return <div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-24" /></div>
}
