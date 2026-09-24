'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, KeyRound, LogOut, ShieldCheck } from 'lucide-react'

import { Button, Card, cn } from '@/components/ui'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { SettingsActivity } from '@/lib/auth/settings'

export function SettingsSecurity({ lastSignInAt, activity }: { lastSignInAt: string | null; activity: SettingsActivity[] }) {
  const [mfaStatus, setMfaStatus] = useState<'loading' | 'enabled' | 'not-configured' | 'unavailable'>('loading')
  const [signOutMessage, setSignOutMessage] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let mounted = true
    void createSupabaseBrowserClient().auth.mfa.listFactors().then(({ data, error }) => {
      if (!mounted) return
      if (error) {
        setMfaStatus('unavailable')
        return
      }
      setMfaStatus(data?.totp?.some((factor) => factor.status === 'verified') ? 'enabled' : 'not-configured')
    }).catch(() => {
      if (mounted) setMfaStatus('unavailable')
    })
    return () => { mounted = false }
  }, [])

  async function signOutOtherSessions() {
    setSigningOut(true)
    setSignOutMessage(null)
    try {
      const { error } = await createSupabaseBrowserClient().auth.signOut({ scope: 'others' })
      setSignOutMessage(error ? 'Other sessions could not be signed out.' : 'Other sessions signed out.')
    } catch {
      setSignOutMessage('Other sessions could not be signed out.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <SecurityRow icon={ShieldCheck} title="Multi-factor authentication" description="Add a second step to protect your account." trailing={mfaStatusLabel(mfaStatus)} />
        <SecurityRow icon={KeyRound} title="Active sessions" description="Supabase reports the current browser session here." trailing="Current browser" />
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border/70 bg-muted/15 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><LogOut className="mt-0.5 size-4 text-foreground-muted" aria-hidden="true" /><div><p className="text-sm font-medium">Sign out other sessions</p><p className="mt-1 text-xs leading-5 text-foreground-muted">Keep this browser signed in and revoke other active sessions.</p></div></div>
        <div className="flex items-center gap-3"><Button type="button" variant="outline" size="small" loading={signingOut} onClick={signOutOtherSessions}>Sign out others</Button>{signOutMessage ? <span className="text-xs text-foreground-muted" role="status">{signOutMessage}</span> : null}</div>
      </div>

      <div className="rounded-md border border-border/70">
        <div className="flex items-center justify-between gap-4 border-b border-border/70 px-4 py-3"><div><p className="text-sm font-medium">Recent workspace activity</p><p className="mt-0.5 text-xs text-foreground-muted">Owner and admin actions recorded for this workspace.</p></div><Clock3 className="size-4 text-foreground-muted" aria-hidden="true" /></div>
        <div className="divide-y divide-border/60">
          {activity.map((item) => <div key={`${item.label}-${item.occurredAt}`} className="flex items-center justify-between gap-4 px-4 py-3"><div><p className="text-sm">{item.label}</p><p className="mt-0.5 text-xs text-foreground-muted">{item.detail}</p></div><time className="shrink-0 font-mono text-[11px] text-foreground-muted" dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time></div>)}
          {activity.length === 0 ? <p className="px-4 py-4 text-sm text-foreground-muted">No recent workspace activity has been recorded.</p> : null}
        </div>
        {lastSignInAt ? <p className="border-t border-border/60 px-4 py-3 text-xs text-foreground-muted">Last sign in: {formatDate(lastSignInAt)}</p> : null}
      </div>
    </div>
  )
}

function SecurityRow({ icon: Icon, title, description, trailing }: { icon: typeof ShieldCheck; title: string; description: string; trailing: string }) {
  return <Card className="rounded-md border-border/70 p-4 shadow-none"><div className="flex items-start gap-3"><Icon className="mt-0.5 size-4 text-foreground-muted" aria-hidden="true" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{title}</p><span className={cn('inline-flex items-center gap-1 text-xs', trailing === 'Enabled' ? 'text-success' : 'text-foreground-muted')}>{trailing === 'Enabled' ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : null}{trailing}</span></div><p className="mt-1 text-xs leading-5 text-foreground-muted">{description}</p></div></div></Card>
}

function mfaStatusLabel(status: 'loading' | 'enabled' | 'not-configured' | 'unavailable') {
  if (status === 'loading') return 'Checking…'
  if (status === 'enabled') return 'Enabled'
  if (status === 'not-configured') return 'Not configured'
  return 'Unavailable'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}
