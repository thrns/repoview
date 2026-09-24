'use client'

import { LogOut, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { BrandLogo } from '@/components/shared/brand-logo'
import { Button } from '@/components/ui'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function SystemAdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const router = useRouter()

  async function signOut() {
    try {
      await createSupabaseBrowserClient().auth.signOut()
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <BrandLogo size={28} />
            <div>
              <p className="font-heading text-sm font-semibold">RepoView operations</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground-muted">Internal only</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-foreground-muted sm:inline" title={email}>{email}</span>
            <Button type="button" variant="ghost" size="small" icon={<LogOut className="size-3.5" aria-hidden="true" />} onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-3 px-5 pt-5 text-xs text-foreground-muted sm:px-8 lg:px-10">
        <ShieldCheck className="size-4" aria-hidden="true" />
        <span>Operator access is separate from customer workspace membership.</span>
      </div>
      <main id="main" className="mx-auto max-w-6xl px-5 py-7 sm:px-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  )
}
