'use client'

import { Activity, ChevronsUpDown, GitBranch, LayoutDashboard, Link2, LogOut, Menu, Settings, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode } from 'react'

import { ThemeSwitcher } from '@/components/shared/theme-switcher'
import { BrandLogo } from '@/components/shared/brand-logo'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Sheet, SheetContent, SheetTrigger, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarLabel, SidebarNavItem, cn } from '@/components/ui'
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
        <SidebarNavItem href="/onboarding" active={pathname === '/onboarding'} onClick={onNavigate} icon={<LayoutDashboard className="size-4" />}>Continue setup</SidebarNavItem>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarLabel>Workspace</SidebarLabel>
      {navigation.map(({ href, label, icon: Icon }) => (
        <SidebarNavItem key={href} href={href} onClick={onNavigate} active={pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))} icon={<Icon className="size-4" />}>{label}</SidebarNavItem>
      ))}
    </SidebarGroup>
  )
}

function AccountFooter({ email, avatarLabel, pathname, onLogout, className, workspaceName, hasMultipleWorkspaces }: { email: string; avatarLabel: string; pathname: string; onLogout: () => void; className?: string; workspaceName: string; hasMultipleWorkspaces: boolean }) {
  const settingsActive = pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings/')

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={`Open workspace and account menu for ${workspaceName}`} className="group h-12 w-full justify-start gap-2 border-transparent bg-transparent px-2 text-left hover:bg-accent/70">
          <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-[11px] font-semibold text-foreground" aria-hidden="true">
            {avatarLabel}
            <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full border-2 border-background bg-success" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-foreground" title={workspaceName}>{workspaceName}</span>
            <span className="mt-0.5 block truncate text-[11px] text-foreground-muted" title={email}>{email}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-foreground-muted" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bottom-full left-0 right-auto mb-2 w-[calc(100%+1.5rem)] min-w-56 p-1.5">
          <DropdownMenuLabel className="px-2 py-2">
            <span className="block truncate text-xs font-medium text-foreground">{workspaceName}</span>
            <span className="mt-0.5 block truncate text-[11px] text-foreground-muted">{email}</span>
          </DropdownMenuLabel>
          {hasMultipleWorkspaces ? <Link href="/workspace/select" role="menuitem" className="flex min-h-9 items-center rounded-sm px-2 text-sm text-foreground-muted hover:bg-accent hover:text-accent-foreground">Switch workspace</Link> : null}
          <DropdownMenuSeparator />
          <Link href="/dashboard/settings" role="menuitem" aria-current={settingsActive ? 'page' : undefined} className={cn('flex min-h-9 items-center gap-2 rounded-sm px-2 text-sm text-foreground-muted hover:bg-accent hover:text-accent-foreground', settingsActive && 'bg-accent text-accent-foreground')}>
            <Settings className="size-4" aria-hidden="true" />
            Settings
          </Link>
          <div className="flex min-h-10 items-center justify-between gap-3 px-2 text-sm text-foreground-muted">
            <span>Theme</span>
            <ThemeSwitcher className="size-9 text-foreground-muted hover:bg-accent hover:text-foreground" />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function AdminShell({ email, children, onboardingIncomplete = false, workspaceName, workspaces = [] }: { email: string; children: ReactNode; onboardingIncomplete?: boolean; workspaceName: string; workspaces?: Array<{ id: string; name: string; role: string }> }) {
  const pathname = usePathname()
  const router = useRouter()
  const isRepositoriesRoute = pathname.replace(/\/+$/, '') === '/dashboard/repositories'
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
    <div
      data-admin-shell
      className="flex h-dvh w-full min-h-0 overflow-hidden overscroll-none bg-background"
    >
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3 px-2 py-2">
            <BrandLogo size={32} />
            <div><div className="font-heading text-[15px] font-semibold tracking-[-0.02em]">RepoView</div><div className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground-muted">Private source</div></div>
          </div>
        </SidebarHeader>
        <SidebarContent><Navigation pathname={pathname} onboardingIncomplete={onboardingIncomplete} /></SidebarContent>
        <SidebarFooter className="shrink-0 p-3">
          <AccountFooter email={email} avatarLabel={avatarLabel} pathname={pathname} onLogout={handleLogout} workspaceName={workspaceName} hasMultipleWorkspaces={workspaces.length > 1} />
        </SidebarFooter>
      </Sidebar>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <Sheet>
            <SheetTrigger variant="ghost" size="icon"><Menu className="size-4" /><span className="sr-only">Open navigation</span></SheetTrigger>
            <SheetContent side="left" aria-label="Primary navigation" className="max-w-xs p-4">
              <div className="flex items-center gap-3 px-2 py-2"><BrandLogo size={32} /><span className="font-heading text-sm font-semibold">RepoView</span></div>
              <nav className="mt-8" aria-label="Primary navigation"><Navigation pathname={pathname} onboardingIncomplete={onboardingIncomplete} /></nav>
              <AccountFooter className="mt-auto min-w-0 overflow-hidden pt-6" email={email} avatarLabel={avatarLabel} pathname={pathname} onLogout={handleLogout} workspaceName={workspaceName} hasMultipleWorkspaces={workspaces.length > 1} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2"><BrandLogo size={24} /><span className="font-heading text-sm font-semibold">RepoView</span></div>
          <ThemeSwitcher />
        </header>
        <main id="main" className={cn('flex min-h-0 min-w-0 flex-1 flex-col', isRepositoriesRoute ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain')}>{children}</main>
      </div>
    </div>
  )
}
