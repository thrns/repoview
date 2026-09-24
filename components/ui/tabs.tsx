'use client'

import { createContext, useContext, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'

import { cn } from './utils'

const TabsContext = createContext<{ value: string; setValue: (value: string) => void } | null>(null)

export function Tabs({ defaultValue, children, className }: { defaultValue: string; children: ReactNode; className?: string }) {
  const [value, setValue] = useState(defaultValue)
  return <TabsContext.Provider value={{ value, setValue }}><div className={className}>{children}</div></TabsContext.Provider>
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="tablist" className={cn('inline-flex h-9 items-center rounded-md bg-muted p-1 text-foreground-muted', className)} {...props} />
}

export function TabsTrigger({ value, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const tabs = useContext(TabsContext)
  const active = tabs?.value === value
  return <button type="button" role="tab" aria-selected={active} onClick={() => tabs?.setValue(value)} className={cn('inline-flex h-7 items-center justify-center rounded-sm px-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active && 'bg-background text-foreground shadow-sm', className)} {...props}>{children}</button>
}

export function TabsContent({ value, className, ...props }: HTMLAttributes<HTMLDivElement> & { value: string }) {
  const tabs = useContext(TabsContext)
  if (tabs?.value !== value) return null
  return <div role="tabpanel" className={cn('mt-2 focus-visible:outline-none', className)} {...props} />
}

export function TabsIndicator() { return null }
