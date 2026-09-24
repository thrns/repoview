'use client'

import { createContext, useContext, useEffect, useId, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'

import { Button, type ButtonProps } from './button'
import { cn } from './utils'

const DialogContext = createContext<{
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
  descriptionId: string
  triggerRef: React.RefObject<HTMLButtonElement | null>
} | null>(null)

export function Dialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  return <DialogContext.Provider value={{ open, setOpen, titleId: `${id}-title`, descriptionId: `${id}-description`, triggerRef }}>{children}</DialogContext.Provider>
}

export function DialogTrigger({ children, className, variant = 'default', size, icon, iconRight, disabled }: { children: ReactNode; className?: string; variant?: ButtonProps['variant']; size?: ButtonProps['size']; icon?: ReactNode; iconRight?: ReactNode; disabled?: boolean }) {
  const dialog = useContext(DialogContext)
  return <Button ref={dialog?.triggerRef} type="button" variant={variant} size={size} icon={icon} iconRight={iconRight} disabled={disabled} className={className} onClick={() => dialog?.setOpen(true)}>{children}</Button>
}

export function DialogContent({ children, className }: HTMLAttributes<HTMLDivElement>) {
  const dialog = useContext(DialogContext)
  const contentRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!dialog?.open) {
      return
    }

    contentRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        dialog.setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      dialog.triggerRef.current?.focus()
    }
  }, [dialog])

  if (!dialog?.open) return null
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) dialog.setOpen(false) }}><section ref={contentRef} role="dialog" aria-modal="true" aria-labelledby={dialog.titleId} aria-describedby={dialog.descriptionId} tabIndex={-1} className={cn('relative w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg', className)}>{children}</section></div>
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} /> }
export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) { return <h2 id={useContext(DialogContext)?.titleId} className={cn('font-heading text-lg font-semibold', className)} {...props} /> }
export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) { return <p id={useContext(DialogContext)?.descriptionId} className={cn('text-sm text-foreground-muted', className)} {...props} /> }
export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('mt-6 flex justify-end gap-2', className)} {...props} /> }
export function DialogSection({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('py-4', className)} {...props} /> }
export function DialogSectionSeparator() { return <div className="my-4 h-px bg-border" /> }
export function DialogClose({ children = 'Close', className }: { children?: ReactNode; className?: string }) {
  const dialog = useContext(DialogContext)
  return <Button type="button" variant="outline" className={className} onClick={() => dialog?.setOpen(false)}>{children}</Button>
}
