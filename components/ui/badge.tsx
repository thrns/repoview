import { type HTMLAttributes } from 'react'

import { cn } from './utils'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning'

const variants: Record<BadgeVariant, string> = {
  default: 'border border-brand/20 bg-brand/10 text-brand',
  secondary: 'border border-border-secondary bg-surface-200 text-foreground-light',
  outline: 'border border-border-control bg-surface-100 text-foreground-lighter',
  destructive: 'border border-destructive/20 bg-destructive/10 text-destructive',
  success: 'border border-success/20 bg-success/10 text-success',
  warning: 'border border-warning/20 bg-warning/10 text-warning',
}

export function Badge({ className, variant = 'secondary', ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn('inline-flex min-h-6 items-center rounded-md px-2 py-0.5 text-xs font-medium leading-4 transition-colors', variants[variant], className)}
      {...props}
    />
  )
}
