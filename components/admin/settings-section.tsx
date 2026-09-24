import type { LucideIcon } from 'lucide-react'

import { cn } from '@/components/ui'

export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
  tone = 'default',
}: {
  id: string
  icon: LucideIcon
  title: string
  description: string
  children: React.ReactNode
  tone?: 'default' | 'danger'
}) {
  return (
    <section id={id} className={cn('scroll-mt-6 overflow-hidden rounded-lg border bg-card', tone === 'danger' ? 'border-destructive/30' : 'border-border/80')}>
      <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/50', tone === 'danger' ? 'border-destructive/30 text-destructive' : 'border-border text-foreground-muted')}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h2 className="font-heading text-base font-semibold tracking-tight">{title}</h2>
            <p className="max-w-2xl text-sm leading-5 text-foreground-muted">{description}</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  )
}
