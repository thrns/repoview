'use client'

import { Activity, GitBranch, LayoutDashboard, Link2, LogOut, Menu, Settings, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode } from 'react'

import { ThemeSwitcher } from '@/components/shared/theme-switcher'
import { BrandLogo } from '@/components/shared/brand-logo'
import { Button, Sheet, SheetContent, SheetTrigger, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarLabel, SidebarNavItem, cn } from '@/components/ui'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const navigation = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/repositories', label: 'Repositories', icon: GitBranch },
  { href: '/dashboard/shares', label: 'Shares', icon: Link2 },
  { href: '/dashboard/viewers', label: 'Viewers', icon: Users },
  { href: '/dashboard/activity', label: 'Activity', icon: Activity },
]

function Navigation({ pathname, onNavigate, onboardingIncomplete = false }: { pathname: string; onNavigate?: () => void; onboardingIncomplete?: boolean }) {
  if (onboardingIncomplete) {
    return (
      <SidebarGroup>
        <SidebarLabel>Getting started</SidebarLabel>
        <SidebarNavItem href="/onboarding" active={pathname === '/onboarding'} icon={<LayoutDashboard className="size-4" />}>
          <span onClick={onNavigate}>Continue setup</span>
        </SidebarNavItem>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarLabel>Workspace</SidebarLabel>
      {navigation.map(({ href, label, icon: Icon }) => (
        <SidebarNavItem key={href} href={href} active={pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))} icon={<Icon className="size-4" />}>
          <span onClick={onNavigate}>{label}</span>
        </SidebarNavItem>
      ))}
    </SidebarGroup>
  )
}

function AccountFooter({ email, avatarLabel, pathname, onLogout, className }: { email: string; avatarLabel: string; pathname: string; onLogout: () => void; className?: string }) {
  const settingsActive = pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings/')

  return (
    <div className={className}>
      <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background font-mono text-[11px] font-semibold text-foreground" aria-hidden="true">
            {avatarLabel}
            <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full border-2 border-background bg-success" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium leading-4" title={email}>{email}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-4 text-foreground-muted">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              <span>Workspace member</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-border/70 pt-3">
          <ThemeSwitcher className="size-8 shrink-0 text-foreground-muted hover:bg-background hover:text-foreground" />
          <Link
            href="/dashboard/settings"
            aria-current={settingsActive ? 'page' : undefined}
            aria-label="Settings"
            title="Settings"
            className={cn(
              'inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              settingsActive ? 'bg-accent text-foreground' : 'text-foreground-muted hover:bg-background hover:text-foreground',
            )}
          >
            <Settings className="size-4" aria-hidden="true" />
          </Link>
          <Button
            variant="ghost"
            size="small"
            className="h-8 shrink-0 px-2 text-xs text-foreground-muted hover:bg-background hover:text-foreground"
            icon={<LogOut className="size-3.5 shrink-0" aria-hidden="true" />}
            onClick={onLogout}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AdminShell({ email, children, onboardingIncomplete = false }: { email: string; children: ReactNode; onboardingIncomplete?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const avatarLabel = email.slice(0, 1).toUpperCase() || 'R'

  async function handleLogout() {
    try {
      await createSupabaseBrowserClient().auth.signOut()
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background">
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3 px-2 py-2">
            <BrandLogo size={32} />
            <div><div className="font-heading text-sm font-semibold">RepoView</div><div className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">Private source</div></div>
          </div>
        </SidebarHeader>
        <SidebarContent><Navigation pathname={pathname} onboardingIncomplete={onboardingIncomplete} /></SidebarContent>
        <SidebarFooter className="shrink-0 p-3">
          <AccountFooter email={email} avatarLabel={avatarLabel} pathname={pathname} onLogout={handleLogout} />
        </SidebarFooter>
      </Sidebar>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 lg:hidden">
          <Sheet>
            <SheetTrigger variant="ghost" size="icon"><Menu className="size-4" /><span className="sr-only">Open navigation</span></SheetTrigger>
            <SheetContent side="left" className="max-w-xs p-4">
              <div className="flex items-center gap-3 px-2 py-2"><BrandLogo size={32} /><span className="font-heading text-sm font-semibold">RepoView</span></div>
              <nav className="mt-8" aria-label="Primary navigation"><Navigation pathname={pathname} onboardingIncomplete={onboardingIncomplete} /></nav>
              <AccountFooter className="mt-auto min-w-0 overflow-hidden pt-6" email={email} avatarLabel={avatarLabel} pathname={pathname} onLogout={handleLogout} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2"><BrandLogo size={24} /><span className="font-heading text-sm font-semibold">RepoView</span></div>
          <ThemeSwitcher />
        </header>
        <main id="main" className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>
      </div>
    </div>
  )
}
