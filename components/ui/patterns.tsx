import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from './utils'

type PageContainerSize = 'small' | 'default' | 'large' | 'full'

const pageContainerSizes: Record<PageContainerSize, string> = {
  small: 'page-container-small',
  default: 'page-container-default',
  large: 'page-container-large',
  full: 'page-container-full',
}

export function PageContainer({ size = 'default', className, ...props }: HTMLAttributes<HTMLDivElement> & { size?: PageContainerSize }) {
  return <div className={cn('page-container', pageContainerSizes[size], className)} {...props} />
}

export function PageHeader({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return <header className={cn('flex flex-col gap-4 border-b border-border-secondary pb-6 sm:flex-row sm:items-end sm:justify-between', className)} {...props}>{children}</header>
}

export function PageHeaderSummary({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-w-0', className)} {...props} />
}

export function PageHeaderTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn('type-page-title', className)} {...props} />
}

export function PageHeaderDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-2 max-w-2xl type-small text-pretty', className)} {...props} />
}

export function PageHeaderAside({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex shrink-0 items-center gap-3 sm:pb-0.5', className)} {...props} />
}

export function PageSection({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('space-y-4', className)} {...props}>{children}</section>
}

export function PageSectionMeta({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between', className)} {...props} />
}

export function PageSectionTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('type-section-title', className)} {...props} />
}

export function PageSectionDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('type-small', className)} {...props} />
}

export function PageSectionContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-w-0', className)} {...props} />
}

export function PageBreadcrumbs({ className, children, ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <nav aria-label="Breadcrumb" className={cn('border-b border-border-secondary', className)} {...props}>{children}</nav>
}

export function FormItemLayout({ label, description, error, children, className }: { label: ReactNode; description?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-2.5 sm:grid-cols-[minmax(10rem,0.75fr)_minmax(0,1.5fr)] sm:items-start sm:gap-6', className)}>
      <div className="min-w-0">
        <div className="type-label">{label}</div>
        {description ? <p className="mt-1 type-meta text-pretty">{description}</p> : null}
      </div>
      <div className="min-w-0">
        {children}
        {error ? <p className="mt-1.5 text-sm text-destructive" role="alert">{error}</p> : null}
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, description, action, align = 'center', className }: { icon?: ReactNode; title: string; description: string; action?: ReactNode; align?: 'center' | 'left'; className?: string }) {
  const centered = align === 'center'
  return (
    <div className={cn('flex min-h-56 flex-col justify-center px-6 py-14', centered ? 'items-center text-center' : 'items-start text-left', className)}>
      {icon ? <span className="flex size-9 items-center justify-center rounded-md border border-border-secondary bg-surface-200 text-foreground-light" aria-hidden="true">{icon}</span> : null}
      <h2 className="mt-4 type-section-title">{title}</h2>
      <p className={cn('mt-1.5 max-w-md type-small', centered && 'text-pretty')}>{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

type AdmonitionType = 'default' | 'success' | 'warning' | 'destructive'

const admonitionClasses: Record<AdmonitionType, string> = {
  default: 'border-border bg-surface-100',
  success: 'border-success/25 bg-success/5',
  warning: 'border-warning/30 bg-warning/5',
  destructive: 'border-destructive/25 bg-destructive/5',
}

export function Admonition({ type = 'default', title, description, icon, children, className }: { type?: AdmonitionType; title?: ReactNode; description?: ReactNode; icon?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div role={type === 'destructive' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-md border p-4 text-sm', admonitionClasses[type], className)}>
      {icon ? <span className="mt-0.5 shrink-0" aria-hidden="true">{icon}</span> : null}
      <div className="min-w-0">
        {title ? <h3 className="font-medium text-foreground">{title}</h3> : null}
        {description ? <p className={cn(Boolean(title) && 'mt-1', 'text-foreground-muted')}>{description}</p> : null}
        {children}
      </div>
    </div>
  )
}

export function ErrorDisplay({ title = 'Something went wrong', errorMessage, icon, action, className }: { title?: string; errorMessage: string; icon?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <Admonition type="destructive" title={title} icon={icon} className={cn('flex-col', className)}>
      <pre className="mt-3 overflow-x-auto rounded-md border border-destructive/20 bg-surface-200/60 p-3 font-mono text-xs leading-5 text-foreground">{errorMessage}</pre>
      {action ? <div className="mt-4">{action}</div> : null}
    </Admonition>
  )
}

export function SkipToContent({ href = '#main' }: { href?: string }) {
  return <a href={href} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background">Skip to content</a>
}
