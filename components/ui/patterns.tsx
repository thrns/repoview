import { AlertTriangle, HelpCircle } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'

import { Card } from './card'
import { cn } from './utils'

type PageContainerSize = 'small' | 'medium' | 'default' | 'large' | 'full'
type PageHeaderSize = PageContainerSize
type PageSectionOrientation = 'horizontal' | 'vertical'

const pageContainerSizes: Record<PageContainerSize, string> = {
  small: 'page-container-small',
  medium: 'page-container-medium',
  default: 'page-container-default',
  large: 'page-container-large',
  full: 'page-container-full',
}

export function PageContainer({ size = 'default', className, ...props }: HTMLAttributes<HTMLDivElement> & { size?: PageContainerSize }) {
  return <div className={cn('page-container @container', pageContainerSizes[size], className)} {...props} />
}

export function PageHeader({ className, children, size = 'default', ...props }: HTMLAttributes<HTMLElement> & { size?: PageHeaderSize }) {
  return (
    <header className={cn('flex w-full flex-col gap-4', size === 'full' ? 'pt-6' : 'pt-12', className)} {...props}>
      {children}
    </header>
  )
}

export function PageHeaderSummary({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex min-w-0 flex-col gap-1', className)} {...props} />
}

export function PageHeaderTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn('heading-title', className)} {...props} />
}

export function PageHeaderDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('heading-subSection max-w-2xl text-pretty text-foreground-light', className)} {...props} />
}

export function PageHeaderAside({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex shrink-0 items-center gap-2', className)} {...props} />
}

export function PageHeaderMeta({ className, children, size = 'default', ...props }: HTMLAttributes<HTMLDivElement> & { size?: PageHeaderSize }) {
  return (
    <PageContainer size={size} className="!py-0">
      <div className={cn('flex flex-col gap-4 @xl:flex-row @xl:items-center @xl:justify-between', className)} {...props}>
        {children}
      </div>
    </PageContainer>
  )
}

export function PageHeaderIcon({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('shrink-0 text-foreground-light', className)} {...props} />
}

export function PageSection({ className, children, orientation = 'vertical', ...props }: HTMLAttributes<HTMLElement> & { orientation?: PageSectionOrientation }) {
  return (
    <section
      className={cn(
        'flex gap-6 pt-12 last:pb-12',
        orientation === 'horizontal' ? 'flex-col @3xl:grid @3xl:grid-cols-[1fr_2fr] @3xl:gap-12' : 'flex-col',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}

export function PageSectionMeta({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="@container">
      <div className={cn('flex flex-col gap-4 @xl:flex-row @xl:items-center @xl:justify-between', className)} {...props} />
    </div>
  )
}

export function PageSectionSummary({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-1 flex-col gap-1', className)} {...props} />
}

export function PageSectionTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('heading-section', className)} {...props} />
}

export function PageSectionDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-5 text-foreground-light', className)} {...props} />
}

export function PageSectionAside({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex shrink-0 items-center gap-2 @xl:self-end', className)} {...props} />
}

export function PageSectionContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-w-0', className)} {...props} />
}

export function PageBreadcrumbs({ className, children, ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <nav aria-label="Breadcrumb" className={cn('border-b border-border-secondary', className)} {...props}>{children}</nav>
}

export function FormItemLayout({ label, description, error, children, className, layout = 'vertical' }: { label: ReactNode; description?: ReactNode; error?: ReactNode; children: ReactNode; className?: string; layout?: 'horizontal' | 'vertical' | 'flex' | 'flex-row' | 'flex-row-reverse' }) {
  if (layout === 'flex-row' || layout === 'flex-row-reverse') {
    const reversed = layout === 'flex-row-reverse'

    return (
      <div className={cn('relative flex gap-2 md:items-start md:justify-between md:gap-6', reversed ? 'flex-col-reverse md:flex-row-reverse' : 'flex-col md:flex-row', className)}>
        <div className="flex min-w-0 grow flex-col">
          <div className="type-label text-pretty">{label}</div>
          {description ? <div className="mt-1 type-meta text-pretty">{description}</div> : null}
        </div>
        <div className="flex w-full min-w-0 shrink-0 flex-col items-start justify-center md:w-1/2 md:items-end xl:w-2/5 [&>div]:md:w-full">
          {children}
          {error ? <p className="mt-1.5 text-sm text-destructive" role="alert">{error}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(layout === 'flex' ? 'flex gap-3' : layout === 'horizontal' ? 'grid gap-2.5 md:grid-cols-12 md:gap-6' : 'flex flex-col gap-2', className)}>
      <div className="min-w-0">
        <div className="type-label">{label}</div>
        {description ? <div className="mt-1 type-meta text-pretty">{description}</div> : null}
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

const defaultSupportHref = 'mailto:tharunpranav.ubc@gmail.com?subject=RepoView%20support%20request'

export function ErrorDisplay({
  title = 'Something went wrong',
  errorMessage,
  icon,
  children,
  supportHref = defaultSupportHref,
  supportLabel = 'Contact support',
  className,
}: {
  title?: ReactNode
  errorMessage: string
  icon?: ReactNode
  children?: ReactNode
  supportHref?: string
  supportLabel?: string
  className?: string
}) {
  return (
    <Card role="alert" className={cn('rounded-md shadow-none', className)}>
      <div className="flex min-h-12 items-center gap-2.5 px-3 py-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning" aria-hidden="true">
          {icon ?? <AlertTriangle className="size-3.5" />}
        </span>
        <h2 className="min-w-0 text-sm font-medium text-foreground">{title}</h2>
      </div>
      <pre className="max-h-48 overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words border-y border-warning/30 bg-warning/5 px-4 py-3 font-mono text-xs leading-5 text-foreground">{errorMessage}</pre>
      {children ? <div>{children}</div> : null}
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-border-secondary px-3 py-2.5 text-xs text-foreground-muted">
        <HelpCircle className="size-4 shrink-0" aria-hidden="true" />
        <span>Need help?</span>
        <a href={supportHref} className="min-w-0 break-words text-foreground underline decoration-border-strong underline-offset-4 hover:text-foreground-light hover:decoration-foreground-muted">
          {supportLabel}
        </a>
      </div>
    </Card>
  )
}

export function SkipToContent({ href = '#main' }: { href?: string }) {
  return <a href={href} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background">Skip to content</a>
}
