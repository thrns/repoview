'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { cn } from './utils'

type Toast = { id: number; title: string; description?: string }
const ToastContext = createContext<{ toast: (toast: Omit<Toast, 'id'>) => void }>({ toast: () => undefined })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const toast = useCallback((item: Omit<Toast, 'id'>) => {
    const id = Date.now()
    setItems((current) => [...current, { ...item, id }])
    window.setTimeout(() => setItems((current) => current.filter((toastItem) => toastItem.id !== id)), 4000)
  }, [])
  const value = useMemo(() => ({ toast }), [toast])
  return <ToastContext.Provider value={value}>{children}<Toaster items={items} /></ToastContext.Provider>
}

export function useToast() { return useContext(ToastContext) }

function Toaster({ items }: { items: Toast[] }) {
  return <div className="fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">{items.map((item) => <div key={item.id} className={cn('rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg')}><p className="text-sm font-medium">{item.title}</p>{item.description ? <p className="mt-1 text-xs text-foreground-muted">{item.description}</p> : null}</div>)}</div>
}
