import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, FormItemLayout, cn } from '@/components/ui'

const settingsActionRowClasses = 'grid min-h-16 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8'

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
  children: ReactNode
  tone?: 'default' | 'danger'
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <Card className={cn('overflow-hidden shadow-none', tone === 'danger' && 'border-destructive/30')}>
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 border-b border-border/70 p-5 sm:p-6">
          <Icon className={cn('mt-0.5 size-4 shrink-0', tone === 'danger' ? 'text-destructive' : 'text-foreground-muted')} aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="max-w-2xl leading-6">{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">{children}</CardContent>
      </Card>
    </section>
  )
}

export function SettingsSubsection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="space-y-3.5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-5 text-foreground-muted">{description}</p> : null}
      </div>
      {children}
    </div>
  )
}

export function SettingsFormRow({ label, description, children, className }: { label: string; description: string; children: ReactNode; className?: string }) {
  return (
    <FormItemLayout label={label} description={description} className={cn('py-4 first:pt-0 last:pb-0', className)}>
      <div className="flex min-w-0 w-full items-center justify-start sm:justify-end">{children}</div>
    </FormItemLayout>
  )
}

export function SettingsRow({ icon: Icon, label, description, children, className }: { icon?: LucideIcon; label: string; description: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn(settingsActionRowClasses, className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? <Icon className="mt-0.5 size-4 shrink-0 text-foreground-muted" aria-hidden="true" /> : null}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-0.5 text-xs leading-5 text-foreground-muted">{description}</p>
        </div>
      </div>
      <div className="flex min-w-0 items-center justify-start sm:justify-end">{children}</div>
    </div>
  )
}

export function SettingsFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mt-7 flex flex-wrap items-center justify-end gap-3 border-t border-border/60 pt-5', className)}>{children}</div>
}
