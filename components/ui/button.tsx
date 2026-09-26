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
  default: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-accent text-accent-foreground hover:bg-accent/80',
  outline: 'border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
  ghost: 'text-foreground-muted hover:bg-accent hover:text-accent-foreground',
  text: 'text-foreground-muted hover:bg-accent/70 hover:text-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
}

const sizeClasses: Record<ButtonSize, string> = {
  tiny: 'h-7 rounded-md px-2 text-xs',
  small: 'min-h-9 rounded-md px-3 text-xs',
  default: 'h-9 rounded-md px-4 text-sm',
  large: 'h-10 rounded-md px-5 text-sm',
  icon: 'size-10 rounded-md p-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, children, variant = 'default', size = 'default', loading, icon, iconRight, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
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
