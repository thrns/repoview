import { type HTMLAttributes } from 'react'

import { cn } from './utils'

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  outline: 'border border-border text-foreground-muted',
  destructive: 'bg-destructive/10 text-destructive dark:bg-destructive/20',
  success: 'bg-success/10 text-success dark:bg-success/20',
}

export function Badge({ className, variant = 'secondary', ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', variants[variant], className)}
      {...props}
    />
  )
}
