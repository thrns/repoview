'use client'

import { useEffect, useRef, type RefObject } from 'react'

const focusableSelector = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => {
    const style = window.getComputedStyle(element)
    return style.visibility !== 'hidden' && style.display !== 'none'
  })
}

export function useModalFocus({
  open,
  containerRef,
  triggerRef,
  onClose,
}: {
  open: boolean
  containerRef: RefObject<HTMLElement | null>
  triggerRef: RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open || !containerRef.current) return

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const container = containerRef.current
    const previouslyHiddenOverflow = document.body.style.overflow
    const focusable = getFocusable(container)
    const initialFocus = focusable[0] ?? container
    initialFocus.focus()
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return
      const nextFocusable = getFocusable(container)
      if (nextFocusable.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }

      const first = nextFocusable[0]
      const last = nextFocusable[nextFocusable.length - 1]
      const activeElement = document.activeElement
      if (event.shiftKey && (activeElement === first || activeElement === container)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previouslyHiddenOverflow
      const restoreTarget = triggerRef.current?.isConnected
        ? triggerRef.current
        : previousFocusRef.current?.isConnected
          ? previousFocusRef.current
          : null
      restoreTarget?.focus()
    }
  }, [containerRef, onClose, open, triggerRef])
}

