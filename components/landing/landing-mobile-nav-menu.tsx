'use client'

import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react'
import { Menu, X } from 'lucide-react'

export function LandingMobileNavMenu({ children, panelId }: { children: ReactNode; panelId: string }) {
  const menuRef = useRef<HTMLDetailsElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  function closeMenu() {
    if (!menuRef.current) return
    menuRef.current.open = false
    setIsOpen(false)
  }

  function closeAfterNavigation(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest('a')) {
      closeMenu()
    }
  }

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    setIsOpen(event.currentTarget.open)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDetailsElement>) {
    if (event.key === 'Escape' && menuRef.current?.open) {
      event.preventDefault()
      closeMenu()
      menuRef.current.querySelector('summary')?.focus()
    }
  }

  return (
    <details ref={menuRef} className="nav-mobile-menu" onToggle={handleToggle} onKeyDown={handleKeyDown}>
      <summary className="nav-menu-button" aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={isOpen} aria-controls={panelId}>
        <Menu className="nav-menu-open-icon size-5" aria-hidden="true" />
        <X className="nav-menu-close-icon size-5" aria-hidden="true" />
      </summary>
      <div id={panelId} className="nav-links nav-links-mobile" onClick={closeAfterNavigation}>
        {children}
      </div>
    </details>
  )
}
