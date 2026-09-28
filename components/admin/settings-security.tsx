'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, KeyRound } from 'lucide-react'

import { SettingsRow, SettingsSubsection } from '@/components/admin/settings-section'
import { Button } from '@/components/ui'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { SettingsActivity } from '@/lib/auth/settings'

export function SettingsSecurity({ activity }: { activity: SettingsActivity[] }) {
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
    <div className="space-y-7">
      <SettingsSubsection title="Account protection" description="Review the safeguards and sessions connected to your account.">
        <div className="divide-y divide-border/60 border-y border-border/60">
          <SettingsRow label="Multi-factor authentication" description="Add a second step to protect your account.">
            <span className={mfaStatus === 'enabled' ? 'inline-flex items-center gap-1.5 text-sm text-success' : 'text-sm text-foreground-muted'}>
              {mfaStatus === 'enabled' ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : null}
              {mfaStatusLabel(mfaStatus)}
            </span>
          </SettingsRow>
          <SettingsRow label="Active sessions" description="Supabase reports the current browser session here.">
            <span className="inline-flex items-center gap-1.5 text-sm text-foreground-muted"><KeyRound className="size-3.5" aria-hidden="true" />Current browser</span>
          </SettingsRow>
          <SettingsRow label="Sign out other sessions" description="Keep this browser signed in and revoke other active sessions.">
            <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" size="small" loading={signingOut} onClick={signOutOtherSessions}>Sign out others</Button>{signOutMessage ? <span className="text-xs text-foreground-muted" role="status">{signOutMessage}</span> : null}</div>
          </SettingsRow>
        </div>
      </SettingsSubsection>

      <div className="border-t border-border/60 pt-7">
        <SettingsSubsection title="Recent workspace activity" description="Owner and admin actions recorded for this workspace.">
          <div className="divide-y divide-border/60 border-y border-border/60">
            {activity.map((item) => <div key={`${item.label}-${item.occurredAt}`} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8"><div><p className="text-sm">{item.label}</p><p className="mt-0.5 text-xs text-foreground-muted">{item.detail}</p></div><time className="shrink-0 text-xs tabular-nums text-foreground-muted sm:text-right" dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time></div>)}
            {activity.length === 0 ? <p className="py-4 text-sm text-foreground-muted">No recent workspace activity has been recorded.</p> : null}
          </div>
        </SettingsSubsection>
      </div>
    </div>
  )
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
