'use client'

import { LogOut, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { ThemeSwitcher } from '@/components/shared/theme-switcher'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, cn } from '@/components/ui'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export type AccountMenuData = {
  email: string
  displayName?: string
  workspaceName?: string
  hasMultipleWorkspaces?: boolean
}

export function AccountMenu({ email, displayName, workspaceName, hasMultipleWorkspaces = false }: AccountMenuData) {
  const pathname = usePathname()
  const router = useRouter()
  const settingsActive = pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings/')
  const avatarLabel = getAvatarLabel(displayName, email)
  const resolvedWorkspaceName = workspaceName?.trim() || 'Workspace'

  async function handleLogout() {
    try {
      await createSupabaseBrowserClient().auth.signOut()
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Open workspace and account menu for ${resolvedWorkspaceName}`} className="size-9 !rounded-full border !border-border !bg-white !p-0 font-mono text-xs font-semibold leading-none !text-black transition-[border-color] hover:!border-border-strong hover:!bg-white aria-expanded:!border-border-strong">
        {avatarLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-1.5">
        <DropdownMenuLabel className="px-2 py-2">
          <span className="block truncate text-xs font-medium text-foreground">{resolvedWorkspaceName}</span>
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
        <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function getAvatarLabel(name: string | undefined, email: string) {
  const source = name?.trim() || email.split('@')[0] || 'RepoView'
  const letters = Array.from(source.replace(/[^\p{L}\p{N}]/gu, '')).slice(0, 2).join('')
  return letters.toUpperCase() || 'RV'
}
