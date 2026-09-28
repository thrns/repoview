'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

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
  const [activeId, setActiveId] = useState(settingsNavigationItems[0]?.id ?? '')

  useEffect(() => {
    const root = document.getElementById('main')
    const sections = settingsNavigationItems
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element))

    if (sections.length === 0) return

    const setActiveFromHash = () => {
      const hash = window.location.hash.slice(1)
      if (hash && sections.some((section) => section.id === hash)) setActiveId(hash)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)

        if (visible[0]?.target instanceof HTMLElement) setActiveId(visible[0].target.id)
      },
      { root, rootMargin: '-8% 0px -68% 0px', threshold: [0, 0.2, 0.5] },
    )

    sections.forEach((section) => observer.observe(section))
    setActiveFromHash()
    window.addEventListener('hashchange', setActiveFromHash)

    return () => {
      observer.disconnect()
      window.removeEventListener('hashchange', setActiveFromHash)
    }
  }, [])

  return (
    <SidebarGroup>
      <SidebarLabel>Manage</SidebarLabel>
      <div className="space-y-1">
        {settingsNavigationItems.map(({ id, label, icon: Icon }) => {
          const active = activeId === id
          return (
            <SidebarNavItem
              key={id}
              href={`#${id}`}
              active={active}
              ariaCurrent="location"
              onClick={() => {
                setActiveId(id)
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
