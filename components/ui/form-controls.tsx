import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

import { cn } from './utils'

const controlClasses = 'flex h-10 w-full rounded-md border border-border-control bg-control px-3 py-1 text-sm text-foreground transition-[background-color,border-color,box-shadow] duration-150 placeholder:text-foreground-muted hover:border-border-strong focus-visible:border-ring focus-visible:bg-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(controlClasses, className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('min-h-24 resize-y', controlClasses, className)} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(controlClasses, 'pr-10', className)} {...props} />
})

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)} {...props} />
}

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Checkbox({ className, type = 'checkbox', ...props }, ref) {
  return <input ref={ref} type={type} className={cn('size-4 rounded-sm border-border-control accent-brand-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background', className)} {...props} />
})

export const Switch = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Switch({ className, type = 'checkbox', role = 'switch', ...props }, ref) {
  return <input ref={ref} type={type} role={role} className={cn('control-switch', className)} {...props} />
})
