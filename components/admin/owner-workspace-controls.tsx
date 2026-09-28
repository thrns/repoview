'use client'

import { ListFilter, Search, X } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'

import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  Input,
  Label,
  PageHeader,
  PageHeaderAside,
  PageHeaderDescription,
  PageHeaderSummary,
  PageHeaderTitle,
  cn,
} from '@/components/ui'

export function OwnerPageHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: string
  description: string
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <PageHeader>
      <PageHeaderSummary>
        <PageHeaderTitle>{title}</PageHeaderTitle>
        <PageHeaderDescription>{description}</PageHeaderDescription>
      </PageHeaderSummary>
      {actions || meta ? <PageHeaderAside>{meta ? <span className="type-meta tabular-nums">{meta}</span> : null}{actions}</PageHeaderAside> : null}
    </PageHeader>
  )
}

export function OwnerListSurface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('overflow-hidden rounded-md border border-border bg-surface-100 text-card-foreground', className)} {...props} />
}

export function OwnerListHeader({
  icon,
  title,
  description,
  meta,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  meta?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 border-b border-border-secondary bg-surface-200/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border-secondary bg-surface-200 text-foreground-light">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-foreground-muted">{description}</p>
        </div>
      </div>
      {meta ? <div className="shrink-0 text-xs tabular-nums text-foreground-muted sm:text-right">{meta}</div> : null}
    </div>
  )
}

export function OwnerListToolbar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-surface-100 px-4 py-4 sm:px-5', className)} {...props} />
}

export function OwnerEmptyState({
  icon,
  title,
  description,
  action,
  align = 'center',
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  align?: 'center' | 'left'
  className?: string
}) {
  return <EmptyState icon={icon} title={title} description={description} action={action} align={align} className={className} />
}

export function OwnerSearchField({
  value,
  onChange,
  label,
  placeholder,
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
  className?: string
}) {
  return (
    <label className={`relative min-w-0 flex-1 ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground-muted" aria-hidden="true" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={label} className="h-10 pl-9" />
    </label>
  )
}

export function OwnerFilterDialog({
  title,
  description,
  activeCount,
  onClear,
  children,
}: {
  title: string
  description: string
  activeCount: number
  onClear: () => void
  children: ReactNode
}) {
  return (
    <Dialog>
      <DialogTrigger variant="outline" size="default" className="h-10 gap-2 px-3">
        <ListFilter className="size-4" aria-hidden="true" />
        Filters / view
        {activeCount > 0 ? <Badge variant="secondary" className="min-h-5 px-1.5 py-0 tabular-nums">{activeCount}</Badge> : null}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-5">{children}</div>
        <DialogFooter>
          {activeCount > 0 ? <Button type="button" variant="text" size="small" className="mr-auto px-0" onClick={onClear}>Clear all</Button> : null}
          <DialogClose>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function OwnerFilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="type-meta">{label}</Label>
      {children}
    </div>
  )
}

export function ActiveFilterSummary({
  filters,
  onClear,
}: {
  filters: Array<{ label: string; value: string; onClear: () => void }>
  onClear: () => void
}) {
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" role="status" aria-label="Active filters">
      <span className="text-foreground-muted">Active:</span>
      {filters.map((filter) => (
        <button
          key={`${filter.label}-${filter.value}`}
          type="button"
          onClick={filter.onClear}
          className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-border-secondary bg-surface-200 px-2 text-accent-foreground transition-colors hover:border-border-secondary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Clear ${filter.label} filter: ${filter.value}`}
        >
          <span className="text-foreground-muted">{filter.label}</span>
          <span className="max-w-44 truncate font-medium">{filter.value}</span>
          <X className="size-3" aria-hidden="true" />
        </button>
      ))}
      <button type="button" onClick={onClear} className="min-h-7 px-1 text-foreground-muted underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Clear all</button>
    </div>
  )
}
