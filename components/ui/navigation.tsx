import Link from 'next/link'
import { type AnchorHTMLAttributes, type HTMLAttributes, type ReactNode, type WheelEvent } from 'react'

import { cn } from './utils'

export function Breadcrumb({ children, className, ...props }: HTMLAttributes<NavElement>) {
  return <nav aria-label="Breadcrumb" className={cn('flex items-center gap-2 text-sm text-foreground-muted', className)} {...props}>{children}</nav>
}

export function BreadcrumbList({ className, ...props }: HTMLAttributes<HTMLOListElement>) { return <ol className={cn('flex flex-wrap items-center gap-2', className)} {...props} /> }
export function BreadcrumbItem({ className, ...props }: HTMLAttributes<HTMLLIElement>) { return <li className={cn('inline-flex items-center gap-2', className)} {...props} /> }
export function BreadcrumbLink({ href, className, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) { return <Link href={href} className={cn('hover:text-foreground hover:underline', className)} {...props}>{children}</Link> }
export function BreadcrumbPage({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) { return <span aria-current="page" className={cn('font-medium text-foreground', className)} {...props}>{children}</span> }
export function BreadcrumbSeparator({ children = '/', className }: { children?: ReactNode; className?: string }) { return <span aria-hidden="true" className={cn('text-foreground-muted', className)}>{children}</span> }

export function Sidebar({ className, ...props }: HTMLAttributes<HTMLElement>) { return <aside className={cn('hidden h-full min-h-0 w-60 shrink-0 overflow-hidden overscroll-contain border-r border-border/70 bg-background lg:flex lg:flex-col', className)} onWheelCapture={preventSidebarWheelChaining} {...props} /> }
export function SidebarHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('p-4', className)} {...props} /> }
export function SidebarContent({ className, ...props }: HTMLAttributes<HTMLElement>) { return <nav className={cn('flex-1 overflow-auto overscroll-contain px-4 py-5', className)} aria-label="Primary navigation" data-sidebar-scroll-region="true" onWheel={preventSidebarScrollChaining} {...props} /> }
export function SidebarFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('border-t border-border/70 p-4', className)} {...props} /> }
export function SidebarGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('mb-6 space-y-1', className)} {...props} /> }
export function SidebarLabel({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('px-2 pb-2 font-mono text-[11px] uppercase tracking-widest text-foreground-muted', className)} {...props} /> }
export function SidebarNavItem({ href, active, icon, children, className }: { href: string; active?: boolean; icon?: ReactNode; children: ReactNode; className?: string }) { return <Link href={href} aria-current={active ? 'page' : undefined} className={cn('flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm text-foreground-muted transition-colors hover:bg-accent hover:text-foreground', active && 'bg-accent/80 font-medium text-foreground shadow-[inset_2px_0_0_hsl(var(--primary))]', className)}>{icon}{children}</Link> }

function preventSidebarWheelChaining(event: WheelEvent<HTMLElement>) {
  const scrollRegion = event.currentTarget.querySelector<HTMLElement>('[data-sidebar-scroll-region]')
  if (scrollRegion?.contains(event.target as Node)) return

  event.preventDefault()
  event.stopPropagation()
}

function preventSidebarScrollChaining(event: WheelEvent<HTMLElement>) {
  event.stopPropagation()
  if (event.currentTarget.scrollHeight <= event.currentTarget.clientHeight) event.preventDefault()
}

type NavElement = HTMLElement
