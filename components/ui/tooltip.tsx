'use client'

import { createPortal } from 'react-dom'
import { createContext, useContext, useLayoutEffect, useState, type FocusEvent, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react'

interface TooltipContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  setTriggerElement: (element: HTMLSpanElement | null) => void
  triggerElement: HTMLSpanElement | null
}

type TooltipPlacement = 'top' | 'bottom'
type TooltipAlign = 'center' | 'end'

const TooltipContext = createContext<TooltipContextValue | null>(null)

function useTooltipContext() {
  const context = useContext(TooltipContext)
  if (!context) throw new Error('Tooltip components must be used inside Tooltip.')
  return context
}

export function TooltipProvider({ children }: { children: ReactNode }) { return <>{children}</> }

export function Tooltip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [triggerElement, setTriggerElement] = useState<HTMLSpanElement | null>(null)

  return (
    <TooltipContext.Provider value={{ open, setOpen, setTriggerElement, triggerElement }}>
      <span className="relative inline-flex">{children}</span>
    </TooltipContext.Provider>
  )
}

export function TooltipTrigger({ children, onMouseEnter, onMouseLeave, onFocus, onBlur, ...props }: HTMLAttributes<HTMLSpanElement>) {
  const { setOpen, setTriggerElement } = useTooltipContext()

  function handleMouseEnter(event: MouseEvent<HTMLSpanElement>) {
    onMouseEnter?.(event)
    setOpen(true)
  }

  function handleMouseLeave(event: MouseEvent<HTMLSpanElement>) {
    onMouseLeave?.(event)
    if (!event.currentTarget.contains(document.activeElement)) setOpen(false)
  }

  function handleFocus(event: FocusEvent<HTMLSpanElement>) {
    onFocus?.(event)
    setOpen(true)
  }

  function handleBlur(event: FocusEvent<HTMLSpanElement>) {
    onBlur?.(event)
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }

  return <span ref={setTriggerElement} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onFocus={handleFocus} onBlur={handleBlur} {...props}>{children}</span>
}

export function TooltipContent({ children, className, style, placement = 'top', align = 'center', ...props }: HTMLAttributes<HTMLSpanElement> & { placement?: TooltipPlacement; align?: TooltipAlign }) {
  const { open, setOpen, triggerElement } = useTooltipContext()
  const [tooltipElement, setTooltipElement] = useState<HTMLSpanElement | null>(null)
  const [position, setPosition] = useState({ left: 0, top: 0, placement })

  useLayoutEffect(() => {
    if (!open || !triggerElement || !tooltipElement) return
    const trigger = triggerElement
    const tooltip = tooltipElement

    function updatePosition() {
      const triggerRect = trigger.getBoundingClientRect()
      const tooltipWidth = tooltip.offsetWidth
      const tooltipHeight = tooltip.offsetHeight
      const viewportPadding = 8
      const preferredLeft = align === 'end' ? triggerRect.right - tooltipWidth : triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2)
      const centeredLeft = Math.min(Math.max(preferredLeft, viewportPadding), window.innerWidth - tooltipWidth - viewportPadding)
      const hasRoomAbove = triggerRect.top - tooltipHeight - viewportPadding >= viewportPadding
      const hasRoomBelow = triggerRect.bottom + tooltipHeight + viewportPadding <= window.innerHeight
      const resolvedPlacement = placement === 'top' && !hasRoomAbove && hasRoomBelow ? 'bottom' : placement === 'bottom' && !hasRoomBelow && hasRoomAbove ? 'top' : placement
      const left = Math.min(Math.max(centeredLeft, viewportPadding), window.innerWidth - tooltipWidth - viewportPadding)
      const top = resolvedPlacement === 'top' ? triggerRect.top - viewportPadding : triggerRect.bottom + viewportPadding
      setPosition({ left, top, placement: resolvedPlacement })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [align, open, placement, tooltipElement, triggerElement])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <span
      ref={setTooltipElement}
      role="tooltip"
      className={`pointer-events-none fixed z-[100] whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-100 shadow-sm ${className ?? ''}`}
      style={{ left: position.left, top: position.top, transform: position.placement === 'top' ? 'translateY(-100%)' : undefined, ...style }}
      onMouseEnter={() => setOpen(true)}
      {...props}
    >
      {children}
    </span>,
    document.body,
  )
}
