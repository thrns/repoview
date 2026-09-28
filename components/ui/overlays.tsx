'use client'

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'

import { Button, type ButtonProps } from './button'
import { useModalFocus } from './modal-focus'
import { cn } from './utils'

const SheetContext = createContext<{
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
  descriptionId: string
  triggerRef: React.RefObject<HTMLButtonElement | null>
} | null>(null)

export function Sheet({ children, open: controlledOpen, onOpenChange }: { children: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = useCallback((nextOpen: boolean) => {
    setUncontrolledOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }, [onOpenChange])
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  return <SheetContext.Provider value={{ open, setOpen, titleId: `${id}-title`, descriptionId: `${id}-description`, triggerRef }}>{children}</SheetContext.Provider>
}

export function SheetTrigger({ children, className, variant = 'outline', size = 'default', onClick, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { children: ReactNode; variant?: ButtonProps['variant']; size?: ButtonProps['size'] }) {
  const sheet = useContext(SheetContext)
  return <Button {...props} ref={sheet?.triggerRef} type="button" variant={variant} size={size} className={className} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) sheet?.setOpen(true) }}>{children}</Button>
}

export function SheetContent({ children, className, side = 'right', 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, 'aria-describedby': ariaDescribedby, ...props }: HTMLAttributes<HTMLElement> & { side?: 'left' | 'right' }) {
  const sheet = useContext(SheetContext)
  const contentRef = useRef<HTMLElement | null>(null)
  const close = useCallback(() => sheet?.setOpen(false), [sheet?.setOpen])

  useModalFocus({ open: Boolean(sheet?.open), containerRef: contentRef, triggerRef: sheet?.triggerRef ?? { current: null }, onClose: close })

  if (!sheet?.open) return null
  const labelledby = ariaLabel ? undefined : ariaLabelledby ?? sheet.titleId
  const describedby = ariaDescribedby ?? (ariaLabel ? undefined : sheet.descriptionId)
  return <div className="ui-sheet-backdrop fixed inset-0 z-50 bg-foreground/50" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) sheet.setOpen(false) }}><aside {...props} ref={contentRef} role="dialog" aria-modal="true" aria-label={ariaLabel ?? (!labelledby ? 'Panel' : undefined)} aria-labelledby={labelledby} aria-describedby={describedby} tabIndex={-1} className={cn('ui-sheet-panel absolute inset-y-0 flex w-full max-w-sm flex-col border-border bg-popover p-6 text-popover-foreground shadow-2xl shadow-foreground/15', side === 'left' ? 'left-0 border-r' : 'right-0 border-l', className)}>{children}</aside></div>
}

export function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex flex-col space-y-1.5', className)} {...props} /> }
export function SheetTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) { return <h2 id={useContext(SheetContext)?.titleId} className={cn('font-heading text-lg font-semibold', className)} {...props} /> }
export function SheetDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) { return <p id={useContext(SheetContext)?.descriptionId} className={cn('text-sm text-foreground-muted', className)} {...props} /> }
export function SheetFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('mt-auto flex justify-end gap-2 pt-6', className)} {...props} /> }
export function SheetSection({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('py-4', className)} {...props} /> }
export function SheetClose({ children = 'Close', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode; className?: string }) {
  const sheet = useContext(SheetContext)
  return <Button {...props} type="button" variant="outline" className={className} onClick={(event) => { props.onClick?.(event); if (!event.defaultPrevented) sheet?.setOpen(false) }}>{children}</Button>
}

type DropdownMenuContextValue = { open: boolean; setOpen: (open: boolean) => void; triggerRef: React.RefObject<HTMLButtonElement | null>; contentRef: React.RefObject<HTMLDivElement | null> }
const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null)

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef, contentRef }}><div ref={rootRef} className="relative">{children}</div></DropdownMenuContext.Provider>
}

export function DropdownMenuTrigger({ children, className, onKeyDown, onClick, 'aria-haspopup': ariaHaspopup, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; className?: string }) {
  const menu = useContext(DropdownMenuContext)

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented || !menu) return
    if (event.key === 'ArrowDown' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      menu.setOpen(true)
      window.setTimeout(() => focusMenuItem(menu.contentRef.current, event.key === 'End' ? 'last' : 'first'), 0)
    }
  }

  return <Button {...props} ref={menu?.triggerRef} type="button" variant="outline" aria-haspopup={ariaHaspopup ?? 'menu'} aria-expanded={menu?.open ?? false} className={className} onClick={(event) => { onClick?.(event); if (event.defaultPrevented || !menu) return; const nextOpen = !menu.open; menu.setOpen(nextOpen); if (nextOpen) window.setTimeout(() => focusMenuItem(menu.contentRef.current, 'first'), 0) }} onKeyDown={handleKeyDown}>{children}</Button>
}

export function DropdownMenuContent({ children, className, onKeyDown, role = 'menu', ...props }: HTMLAttributes<HTMLDivElement>) {
  const menu = useContext(DropdownMenuContext)
  if (!menu?.open) return null

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented || !menu) return
    if (event.key === 'Escape') {
      event.preventDefault()
      menu.setOpen(false)
      menu.triggerRef.current?.focus()
      return
    }
    if (role === 'menu' && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End')) {
      event.preventDefault()
      const direction = event.key === 'ArrowUp' ? 'previous' : event.key === 'Home' ? 'first' : event.key === 'End' ? 'last' : 'next'
      focusMenuItem(menu.contentRef.current, direction)
    }
  }

  return <div {...props} ref={menu.contentRef} role={role} onKeyDown={handleKeyDown} className={cn('ui-menu-panel absolute right-0 z-50 mt-2 min-w-48 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl shadow-foreground/10', className)}>{children}</div>
}
export function DropdownMenuLabel({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('px-2 py-1.5 text-xs font-medium text-foreground-muted', className)} {...props} /> }
export function DropdownMenuSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('my-1 h-px bg-border', className)} {...props} /> }
export function DropdownMenuItem({ className, children, onClick, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const menu = useContext(DropdownMenuContext)
  return <button {...props} type="button" role="menuitem" className={cn('flex min-h-9 w-full items-center rounded-md px-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent', className)} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) menu?.setOpen(false) }}>{children}</button>
}

function focusMenuItem(content: HTMLDivElement | null, direction: 'first' | 'last' | 'next' | 'previous') {
  if (!content) return
  const items = [...content.querySelectorAll<HTMLElement>('[role="menuitem"], button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])')]
  if (items.length === 0) return
  const currentIndex = items.indexOf(document.activeElement as HTMLElement)
  const nextIndex = direction === 'first'
    ? 0
    : direction === 'last'
      ? items.length - 1
      : direction === 'previous'
        ? (currentIndex - 1 + items.length) % items.length
        : (currentIndex + 1) % items.length
  items[nextIndex]?.focus()
}
