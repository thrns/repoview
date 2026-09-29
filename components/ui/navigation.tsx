import Link from 'next/link'
import { type AnchorHTMLAttributes, type AriaAttributes, type HTMLAttributes, type ReactNode, type WheelEvent } from 'react'

import { cn } from './utils'

export function Breadcrumb({ children, className, ...props }: HTMLAttributes<NavElement>) {
  return <nav aria-label="Breadcrumb" className={cn('flex items-center gap-2 text-sm text-foreground-muted', className)} {...props}>{children}</nav>
}

export function BreadcrumbList({ className, ...props }: HTMLAttributes<HTMLOListElement>) { return <ol className={cn('flex flex-wrap items-center gap-2', className)} {...props} /> }
export function BreadcrumbItem({ className, ...props }: HTMLAttributes<HTMLLIElement>) { return <li className={cn('inline-flex items-center gap-2', className)} {...props} /> }
export function BreadcrumbLink({ href, className, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) { return <Link href={href} className={cn('hover:text-foreground hover:underline', className)} {...props}>{children}</Link> }
export function BreadcrumbPage({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) { return <span aria-current="page" className={cn('font-medium text-foreground', className)} {...props}>{children}</span> }
export function BreadcrumbSeparator({ children = '/', className }: { children?: ReactNode; className?: string }) { return <span aria-hidden="true" className={cn('text-foreground-muted', className)}>{children}</span> }

export function Sidebar({ className, ...props }: HTMLAttributes<HTMLElement>) { return <aside className={cn('hidden h-full min-h-0 w-56 shrink-0 overflow-hidden overscroll-contain border-r border-border-secondary bg-default lg:flex lg:flex-col', className)} onWheelCapture={preventSidebarWheelChaining} {...props} /> }
export function SidebarHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('border-b border-border-secondary bg-default p-4', className)} {...props} /> }
export function SidebarContent({ className, ...props }: HTMLAttributes<HTMLElement>) { return <nav className={cn('flex-1 overflow-auto overscroll-contain px-4 py-6', className)} aria-label="Primary navigation" data-sidebar-scroll-region="true" onWheel={preventSidebarScrollChaining} {...props} /> }
export function SidebarFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('border-t border-border-secondary bg-default p-4', className)} {...props} /> }
export function SidebarGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('mb-7 space-y-1', className)} {...props} /> }
export function SidebarLabel({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('px-3 pb-2 font-mono text-xs font-semibold uppercase tracking-wider text-foreground-muted', className)} {...props} /> }
export function SidebarNavItem({ href, active, ariaCurrent = 'page', icon, children, className, onClick }: { href: string; active?: boolean; ariaCurrent?: AriaAttributes['aria-current']; icon?: ReactNode; children: ReactNode; className?: string; onClick?: () => void }) { return <Link href={href} onClick={onClick} aria-current={active ? ariaCurrent : undefined} className={cn('relative flex min-h-9 w-full items-center gap-2.5 rounded-sm px-3 text-sm text-foreground-muted transition-[background-color,color] duration-150 hover:bg-surface-200 hover:text-foreground', active && 'bg-surface-200 font-medium text-foreground', className)}>{icon}{children}</Link> }

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
