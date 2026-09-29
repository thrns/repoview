'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { settingsNavigationItems } from '@/components/admin/settings-navigation-data'
import { cn } from '@/components/ui'

export function SettingsNavigation({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Settings navigation" className={cn('flex min-w-0 items-center gap-3 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {settingsNavigationItems.map(({ id, label, icon: Icon }) => {
        const href = `/dashboard/settings/${id}`
        const active = pathname === href || (pathname === '/dashboard/settings' && id === 'account')
        return (
          <Link
            key={id}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-surface-200/70 px-3 text-sm text-foreground-muted transition-[background-color,color] duration-150 ease-out hover:bg-surface-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
              active && 'bg-brand/10 font-medium text-brand hover:bg-brand/10 hover:text-brand',
            )}
          >
            <Icon className={cn('size-4 shrink-0', active ? 'text-brand' : 'text-foreground-muted')} aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
