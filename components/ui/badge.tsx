import { type HTMLAttributes } from 'react'

import { cn } from './utils'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning'

const variants: Record<BadgeVariant, string> = {
  default: 'border border-primary/15 bg-primary-soft text-primary-readable',
  secondary: 'border border-border/60 bg-muted text-muted-foreground',
  outline: 'border border-border-strong/70 bg-card text-foreground-muted',
  destructive: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  success: 'bg-success/10 text-success dark:bg-success/20',
  warning: 'bg-warning/10 text-warning dark:bg-warning/20',
}

export function Badge({ className, variant = 'secondary', ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn('inline-flex min-h-6 items-center rounded-full px-2 py-0.5 text-xs font-medium leading-4 transition-colors', variants[variant], className)}
      {...props}
    />
  )
}
