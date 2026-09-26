'use client'

import { createContext, useContext, useId, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'

import { cn } from './utils'

const TabsContext = createContext<{ value: string; setValue: (value: string) => void; baseId: string } | null>(null)

export function Tabs({ defaultValue, children, className }: { defaultValue: string; children: ReactNode; className?: string }) {
  const [value, setValue] = useState(defaultValue)
  const baseId = useId()
  return <TabsContext.Provider value={{ value, setValue, baseId }}><div className={className}>{children}</div></TabsContext.Provider>
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="tablist" className={cn('inline-flex h-9 items-center rounded-md bg-muted p-1 text-foreground-muted', className)} {...props} />
}

export function TabsTrigger({ value, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const tabs = useContext(TabsContext)
  const active = tabs?.value === value
  const tabId = tabs ? `${tabs.baseId}-tab-${value}` : undefined
  const panelId = tabs ? `${tabs.baseId}-panel-${value}` : undefined
  const { onKeyDown, ...buttonProps } = props

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented || !tabs) return
    const tabList = event.currentTarget.parentElement
    const tabButtons = tabList ? [...tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]')] : []
    if (tabButtons.length === 0) return
    const currentIndex = tabButtons.indexOf(event.currentTarget)
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % tabButtons.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabButtons.length - 1
    if (nextIndex === null) return
    event.preventDefault()
    const nextTab = tabButtons[nextIndex]
    nextTab.focus()
    nextTab.click()
  }

  return <button {...buttonProps} type="button" id={tabId} role="tab" aria-selected={active} aria-controls={panelId} tabIndex={active ? 0 : -1} onClick={() => tabs?.setValue(value)} onKeyDown={handleKeyDown} className={cn('inline-flex h-8 items-center justify-center rounded-sm px-3 text-sm font-medium transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-muted', active && 'bg-background text-foreground shadow-sm', className)}>{children}</button>
}

export function TabsContent({ value, className, ...props }: HTMLAttributes<HTMLDivElement> & { value: string }) {
  const tabs = useContext(TabsContext)
  if (tabs?.value !== value) return null
  return <div id={tabs ? `${tabs.baseId}-panel-${value}` : undefined} role="tabpanel" aria-labelledby={tabs ? `${tabs.baseId}-tab-${value}` : undefined} tabIndex={0} className={cn('mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)} {...props} />
}

export function TabsIndicator() { return null }
