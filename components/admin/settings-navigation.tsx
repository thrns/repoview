'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { settingsNavigationItems } from '@/components/admin/settings-navigation-data'
import { SidebarGroup, SidebarLabel, SidebarNavItem, cn } from '@/components/ui'

export function SettingsSidebarHeader({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="space-y-5">
      <Link
        href="/dashboard"
        aria-label="Back to workspace"
        onClick={onNavigate}
        className="group inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowLeft className="size-4 shrink-0 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
        <span>Back to workspace</span>
      </Link>
      <div className="px-2">
        <p className="font-heading text-base font-semibold tracking-tight text-foreground">Settings</p>
        <p className="mt-1 text-xs leading-5 text-foreground-muted">Workspace preferences</p>
      </div>
    </div>
  )
}

export function SettingsNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarLabel>Manage</SidebarLabel>
      <div className="space-y-1">
        {settingsNavigationItems.map(({ id, label, icon: Icon }) => {
          const href = `/dashboard/settings/${id}`
          const active = pathname === href || (pathname === '/dashboard/settings' && id === 'account')
          return (
            <SidebarNavItem
              key={id}
              href={href}
              active={active}
              ariaCurrent="location"
              onClick={() => {
                onNavigate?.()
              }}
              icon={<Icon className={cn('size-4', active ? 'text-foreground' : 'text-foreground-muted')} aria-hidden="true" />}
            >
              {label}
            </SidebarNavItem>
          )
        })}
      </div>
    </SidebarGroup>
  )
}
