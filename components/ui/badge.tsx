import { type HTMLAttributes } from 'react'

import { cn } from './utils'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-accent text-accent-foreground',
  secondary: 'bg-muted text-muted-foreground',
  outline: 'border border-border/80 bg-background text-foreground-muted',
  destructive: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  success: 'bg-success/10 text-success dark:bg-success/20',
  warning: 'bg-warning/10 text-warning dark:bg-warning/20',
}

export function Badge({ className, variant = 'secondary', ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn('inline-flex min-h-6 items-center rounded-md px-2 py-0.5 text-xs font-medium leading-4', variants[variant], className)}
      {...props}
    />
  )
}
