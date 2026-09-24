'use client'

import { createContext, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'

import { Button, type ButtonProps } from './button'
import { cn } from './utils'

const SheetContext = createContext<{
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
  descriptionId: string
  triggerRef: React.RefObject<HTMLButtonElement | null>
} | null>(null)

export function Sheet({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  return <SheetContext.Provider value={{ open, setOpen, titleId: `${id}-title`, descriptionId: `${id}-description`, triggerRef }}>{children}</SheetContext.Provider>
}

export function SheetTrigger({ children, className, variant = 'outline', size = 'default', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: ButtonProps['variant']; size?: ButtonProps['size'] }) {
  const sheet = useContext(SheetContext)
  return <Button ref={sheet?.triggerRef} type="button" variant={variant} size={size} className={className} onClick={() => sheet?.setOpen(true)} {...props}>{children}</Button>
}

export function SheetContent({ children, className, side = 'right' }: HTMLAttributes<HTMLElement> & { side?: 'left' | 'right' }) {
  const sheet = useContext(SheetContext)
  const contentRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!sheet?.open) {
      return
    }

    contentRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        sheet.setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      sheet.triggerRef.current?.focus()
    }
  }, [sheet])

  if (!sheet?.open) return null
  return <div className="fixed inset-0 z-50 bg-black/50" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) sheet.setOpen(false) }}><aside ref={contentRef} role="dialog" aria-modal="true" aria-labelledby={sheet.titleId} aria-describedby={sheet.descriptionId} tabIndex={-1} className={cn('absolute inset-y-0 flex w-full max-w-sm flex-col border-border bg-background p-6 shadow-lg', side === 'left' ? 'left-0 border-r' : 'right-0 border-l', className)}>{children}</aside></div>
}

export function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex flex-col space-y-1.5', className)} {...props} /> }
export function SheetTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) { return <h2 id={useContext(SheetContext)?.titleId} className={cn('font-heading text-lg font-semibold', className)} {...props} /> }
export function SheetDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) { return <p id={useContext(SheetContext)?.descriptionId} className={cn('text-sm text-foreground-muted', className)} {...props} /> }
export function SheetFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('mt-auto flex justify-end gap-2 pt-6', className)} {...props} /> }
export function SheetSection({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('py-4', className)} {...props} /> }
export function SheetClose({ children = 'Close', className }: { children?: ReactNode; className?: string }) {
  const sheet = useContext(SheetContext)
  return <Button type="button" variant="outline" className={className} onClick={() => sheet?.setOpen(false)}>{children}</Button>
}

export function DropdownMenu({ children }: { children: ReactNode }) { return <details className="relative">{children}</details> }
export function DropdownMenuTrigger({ children, className }: { children: ReactNode; className?: string }) { return <summary className="list-none [&::-webkit-details-marker]:hidden"><Button type="button" variant="outline" className={className}>{children}</Button></summary> }
export function DropdownMenuContent({ children, className }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('absolute right-0 z-50 mt-2 min-w-48 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md', className)}>{children}</div> }
export function DropdownMenuLabel({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('px-2 py-1.5 text-xs font-medium text-foreground-muted', className)} {...props} /> }
export function DropdownMenuSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('my-1 h-px bg-border', className)} {...props} /> }
export function DropdownMenuItem({ className, children, ...props }: HTMLAttributes<HTMLButtonElement>) { return <button type="button" className={cn('flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent', className)} {...props}>{children}</button> }
