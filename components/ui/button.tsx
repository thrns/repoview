import { LoaderCircle } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

import { cn } from './utils'

type ButtonVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'text' | 'destructive'
type ButtonSize = 'tiny' | 'small' | 'default' | 'large' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'border border-border-control bg-surface-100 text-foreground hover:border-border-strong hover:bg-surface-200',
  primary: 'bg-brand-default text-brand-foreground hover:bg-brand-default/90',
  secondary: 'border border-border bg-surface-200 text-foreground-light hover:border-border-strong hover:bg-surface-300',
  outline: 'border border-border-control bg-surface-100 text-foreground hover:border-border-strong hover:bg-surface-200',
  ghost: 'text-foreground-light hover:bg-surface-200 hover:text-foreground',
  text: 'text-foreground-light hover:bg-surface-200 hover:text-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
}

const sizeClasses: Record<ButtonSize, string> = {
  tiny: 'h-7 rounded-sm px-2 text-xs',
  small: 'min-h-9 rounded-md px-3 text-xs',
  default: 'h-9 rounded-md px-4 text-sm',
  large: 'h-10 rounded-md px-5 text-sm',
  icon: 'size-9 rounded-md p-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, children, variant = 'default', size = 'default', loading, icon, iconRight, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,border-color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
})
