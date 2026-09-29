'use client'

import { Activity, GitBranch, LayoutDashboard, Link2, LogOut, Menu, Settings, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'

import { BrandLogo } from '@/components/shared/brand-logo'
import { settingsNavigationItems } from '@/components/admin/settings-navigation-data'
import { ThemeSwitcher } from '@/components/shared/theme-switcher'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Sheet, SheetContent, SheetTrigger, Sidebar, SidebarContent, SidebarGroup, SidebarNavItem, SkipToContent, cn } from '@/components/ui'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const navigation = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/repositories', label: 'Repositories', icon: GitBranch },
  { href: '/dashboard/shares', label: 'Shares', icon: Link2 },
  { href: '/dashboard/viewers', label: 'Viewers', icon: Users },
  { href: '/dashboard/activity', label: 'Activity', icon: Activity },
]

function Navigation({ pathname, onNavigate, onboardingIncomplete = false }: { pathname: string; onNavigate?: () => void; onboardingIncomplete?: boolean }) {
  const settingsActive = pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings/')

  return (
    <>
      {onboardingIncomplete ? (
        <SidebarGroup className="mb-5">
          <SidebarNavItem href="/onboarding" active={pathname === '/onboarding'} onClick={onNavigate} icon={<LayoutDashboard className="size-4 shrink-0" />}>Continue setup</SidebarNavItem>
        </SidebarGroup>
      ) : null}

      <SidebarGroup className="mb-0">
        {navigation.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`))
          return (
            <SidebarNavItem key={href} href={href} onClick={onNavigate} active={active} icon={<Icon className={cn('size-4 shrink-0', active ? 'text-foreground' : 'text-foreground-muted')} />}>{label}</SidebarNavItem>
          )
        })}
      </SidebarGroup>

      <div className="mt-5 border-t border-border-secondary pt-5">
        <SidebarGroup className="mb-0">
          <SidebarNavItem href="/dashboard/settings" active={settingsActive} onClick={onNavigate} icon={<Settings className={cn('size-4 shrink-0', settingsActive ? 'text-foreground' : 'text-foreground-muted')} />}>Settings</SidebarNavItem>
        </SidebarGroup>
      </div>
    </>
  )
}

function AccountMenu({ email, avatarLabel, pathname, onLogout, workspaceName, hasMultipleWorkspaces }: { email: string; avatarLabel: string; pathname: string; onLogout: () => void; workspaceName: string; hasMultipleWorkspaces: boolean }) {
  const settingsActive = pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings/')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Open workspace and account menu for ${workspaceName}`} className="group size-9 !rounded-full border-border bg-surface-200 p-0 hover:border-border-strong hover:bg-surface-300">
        <span className="relative flex size-7 items-center justify-center rounded-full border border-border-control bg-surface-100 font-mono text-xs font-semibold text-foreground" aria-hidden="true">
          {avatarLabel}
          <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full border-2 border-background bg-success" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-1.5">
        <DropdownMenuLabel className="px-2 py-2">
          <span className="block truncate text-xs font-medium text-foreground">{workspaceName}</span>
          <span className="mt-0.5 block truncate text-xs text-foreground-muted">{email}</span>
        </DropdownMenuLabel>
        {hasMultipleWorkspaces ? <Link href="/workspace/select" role="menuitem" className="flex min-h-9 items-center rounded-sm px-2 text-sm text-foreground-muted hover:bg-accent hover:text-accent-foreground">Switch workspace</Link> : null}
        <DropdownMenuSeparator />
        <Link href="/dashboard/settings/account" role="menuitem" aria-current={settingsActive ? 'page' : undefined} className={cn('flex min-h-9 items-center gap-2 rounded-sm px-2 text-sm text-foreground-muted hover:bg-accent hover:text-accent-foreground', settingsActive && 'bg-accent text-accent-foreground')}>
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
  )
}

function getAdminPageTitle(pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/dashboard'
  if (normalizedPath === '/dashboard') return 'Overview'
  if (normalizedPath === '/dashboard/repositories') return 'Repositories'
  if (normalizedPath === '/dashboard/shares') return 'Shares'
  if (normalizedPath === '/dashboard/shares/new') return 'New share'
  if (normalizedPath.startsWith('/dashboard/shares/')) return 'Share details'
  if (normalizedPath === '/dashboard/viewers') return 'Viewers'
  if (normalizedPath.startsWith('/dashboard/viewers/')) return 'Viewer details'
  if (normalizedPath === '/dashboard/activity') return 'Activity'
  if (normalizedPath === '/dashboard/settings') return 'Settings'
  if (normalizedPath.startsWith('/dashboard/settings/')) {
    const settingsId = normalizedPath.split('/')[3]
    const settingsItem = settingsNavigationItems.find((item) => item.id === settingsId)
    return settingsItem ? `Settings / ${settingsItem.label}` : 'Settings'
  }
  return 'Dashboard'
}

function getAvatarLabel(name: string | undefined, email: string) {
  const source = name?.trim() || email.split('@')[0] || 'RepoView'
  const letters = Array.from(source.replace(/[^\p{L}\p{N}]/gu, '')).slice(0, 2).join('')
  return letters.toUpperCase() || 'RV'
}

export function AdminShell({ email, children, displayName, onboardingIncomplete = false, workspaceName, workspaces = [] }: { email: string; children: ReactNode; displayName?: string; onboardingIncomplete?: boolean; workspaceName: string; workspaces?: Array<{ id: string; name: string; role: string }> }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const avatarLabel = getAvatarLabel(displayName, email)
  const pageTitle = getAdminPageTitle(pathname)

  useEffect(() => {
    setMobileNavigationOpen(false)
  }, [pathname])

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
      className="flex h-dvh w-full min-h-0 flex-col overflow-hidden overscroll-none bg-background"
    >
      <SkipToContent />
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-secondary bg-background px-3 sm:px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="lg:hidden">
            <Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
              <SheetTrigger variant="ghost" size="icon" aria-label="Open navigation"><Menu className="size-4" /></SheetTrigger>
              <SheetContent side="left" aria-label="Primary navigation" className="max-w-xs p-0">
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex h-14 shrink-0 items-center border-b border-border-secondary px-4">
                    <span className="font-heading text-sm font-semibold text-foreground">Navigation</span>
                  </div>
                  <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Primary navigation">
                    <Navigation pathname={pathname} onNavigate={() => setMobileNavigationOpen(false)} onboardingIncomplete={onboardingIncomplete} />
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 rounded-sm text-foreground focus-visible:outline-none" aria-label="RepoView overview">
            <BrandLogo size={24} priority />
            <span className="font-heading text-sm font-semibold tracking-tight">RepoView</span>
          </Link>
          <span aria-hidden="true" className="px-1 text-sm text-foreground-muted">/</span>
          <span className="min-w-0 max-w-[12rem] truncate text-sm text-foreground-muted">{pageTitle}</span>
        </div>

        <AccountMenu email={email} avatarLabel={avatarLabel} pathname={pathname} onLogout={handleLogout} workspaceName={workspaceName} hasMultipleWorkspaces={workspaces.length > 1} />
      </header>

      <div className="flex min-h-0 min-w-0 flex-1">
        <Sidebar>
          <SidebarContent aria-label="Primary navigation" className="px-3 py-4">
            <Navigation pathname={pathname} onboardingIncomplete={onboardingIncomplete} />
          </SidebarContent>
        </Sidebar>

        <main id="main" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  )
}
