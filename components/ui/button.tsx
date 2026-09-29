import { LoaderCircle } from 'lucide-react'
import { Children, cloneElement, forwardRef, isValidElement, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react'

import { cn } from './utils'

type ButtonVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'text' | 'warning' | 'destructive' | 'destructive-outline'
type ButtonSize = 'tiny' | 'small' | 'default' | 'large' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-foreground text-background hover:bg-foreground/90',
  primary: 'bg-brand-default text-brand-foreground hover:bg-brand-default/90',
  secondary: 'border border-border bg-surface-200 text-foreground-light hover:border-border-strong hover:bg-surface-300',
  outline: 'border border-border-control bg-surface-100 text-foreground hover:border-border-strong hover:bg-surface-200',
  ghost: 'text-foreground-light hover:bg-surface-200 hover:text-foreground',
  text: 'text-foreground-light hover:bg-surface-200 hover:text-foreground',
  warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  'destructive-outline': 'border border-destructive/45 bg-surface-100 text-destructive hover:border-destructive/70 hover:bg-destructive/5',
}

const sizeClasses: Record<ButtonSize, string> = {
  tiny: 'h-7 rounded-sm px-2 text-xs',
  small: 'min-h-9 rounded-md px-3 text-xs',
  default: 'h-9 rounded-md px-4 text-sm',
  large: 'h-10 rounded-md px-5 text-sm',
  icon: 'size-9 rounded-md p-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { asChild = false, className, children, variant = 'default', size = 'default', loading, icon, iconRight, disabled, ...props },
  ref
) {
  const buttonClassName = cn(
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,border-color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className
  )

  if (asChild) {
    const child = Children.only(children) as ReactElement<{ className?: string }>

    if (!isValidElement(child)) {
      throw new Error('Button with asChild requires a single valid React element child')
    }

    return cloneElement(child, {
      ...props,
      className: cn(buttonClassName, child.props.className),
      'aria-busy': loading || undefined,
      ref,
    } as Partial<typeof child.props>)
  }

  return (
    <button
      ref={ref}
      className={buttonClassName}
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
