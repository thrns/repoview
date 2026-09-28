'use client'

import { createContext, useCallback, useContext, useId, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'

import { Button, type ButtonProps } from './button'
import { useModalFocus } from './modal-focus'
import { cn } from './utils'

type DialogContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
  descriptionId: string
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function Dialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  return <DialogContext.Provider value={{ open, setOpen, titleId: `${id}-title`, descriptionId: `${id}-description`, triggerRef }}>{children}</DialogContext.Provider>
}

export function DialogTrigger({ children, className, variant = 'default', size, icon, iconRight, disabled, onClick, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { children: ReactNode; className?: string; variant?: ButtonProps['variant']; size?: ButtonProps['size']; icon?: ReactNode; iconRight?: ReactNode; disabled?: boolean }) {
  const dialog = useContext(DialogContext)
  return <Button {...props} ref={dialog?.triggerRef} type="button" variant={variant} size={size} icon={icon} iconRight={iconRight} disabled={disabled} className={className} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) dialog?.setOpen(true) }}>{children}</Button>
}

export function DialogContent({ children, className, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, 'aria-describedby': ariaDescribedby, ...props }: HTMLAttributes<HTMLElement>) {
  const dialog = useContext(DialogContext)
  const contentRef = useRef<HTMLElement | null>(null)
  const close = useCallback(() => dialog?.setOpen(false), [dialog?.setOpen])

  useModalFocus({ open: Boolean(dialog?.open), containerRef: contentRef, triggerRef: dialog?.triggerRef ?? { current: null }, onClose: close })

  if (!dialog?.open) return null
  const labelledby = ariaLabel ? undefined : ariaLabelledby ?? dialog.titleId
  const describedby = ariaDescribedby ?? dialog.descriptionId
  return <div className="ui-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) dialog.setOpen(false) }}><section {...props} ref={contentRef} role="dialog" aria-modal="true" aria-label={ariaLabel ?? (!labelledby ? 'Dialog' : undefined)} aria-labelledby={labelledby} aria-describedby={describedby} tabIndex={-1} className={cn('ui-dialog-panel relative w-full max-w-lg rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-2xl shadow-foreground/15', className)}>{children}</section></div>
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} /> }
export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  const dialog = useContext(DialogContext)
  return <h2 id={dialog?.titleId} className={cn('font-heading text-lg font-semibold', className)} {...props} />
}
export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  const dialog = useContext(DialogContext)
  return <p id={dialog?.descriptionId} className={cn('text-sm text-foreground-muted', className)} {...props} />
}
export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('mt-6 flex justify-end gap-2', className)} {...props} /> }
export function DialogSection({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('py-4', className)} {...props} /> }
export function DialogSectionSeparator() { return <div className="my-4 h-px bg-border" /> }
export function DialogClose({ children = 'Close', className }: { children?: ReactNode; className?: string }) {
  const dialog = useContext(DialogContext)
  return <Button type="button" variant="outline" className={className} onClick={() => dialog?.setOpen(false)}>{children}</Button>
}
