'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { settingsNavigationItems } from '@/components/admin/settings-navigation-data'
import { cn } from '@/components/ui'

export function SettingsNavigation({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Settings navigation" className={cn('flex min-w-0 items-center gap-1 overflow-x-auto py-2', className)}>
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
              'inline-flex min-h-9 shrink-0 items-center gap-2 rounded-sm px-3 text-sm text-foreground-muted transition-[background-color,color] duration-150 hover:bg-surface-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
              active && 'bg-surface-200 font-medium text-foreground',
            )}
          >
            <Icon className={cn('size-4', active ? 'text-foreground' : 'text-foreground-muted')} aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
