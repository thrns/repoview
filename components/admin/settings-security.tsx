'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, KeyRound } from 'lucide-react'

import { Button, Card, CardContent, FormItemLayout } from '@/components/ui'
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
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <FormItemLayout layout="flex-row" label="Multi-factor authentication" description="Add a second step to protect your account.">
            <span className={mfaStatus === 'enabled' ? 'inline-flex items-center gap-1.5 text-sm text-success' : 'text-sm text-foreground-muted'}>
              {mfaStatus === 'enabled' ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : null}
              {mfaStatusLabel(mfaStatus)}
            </span>
          </FormItemLayout>
        </CardContent>
        <CardContent>
          <FormItemLayout layout="flex-row" label="Active sessions" description="Supabase reports the current browser session here.">
            <span className="inline-flex items-center gap-1.5 text-sm text-foreground-muted"><KeyRound className="size-3.5" aria-hidden="true" />Current browser</span>
          </FormItemLayout>
        </CardContent>
        <CardContent>
          <FormItemLayout layout="flex-row" label="Sign out other sessions" description="Keep this browser signed in and revoke other active sessions.">
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button type="button" variant="outline" size="small" loading={signingOut} onClick={signOutOtherSessions}>Sign out others</Button>
              {signOutMessage ? <span className="text-xs text-foreground-muted" role="status">{signOutMessage}</span> : null}
            </div>
          </FormItemLayout>
        </CardContent>
      </Card>

      <Card>
        {activity.map((item, index) => (
          <CardContent key={`${item.label}-${item.occurredAt}`} className={index === 0 ? 'pt-6' : undefined}>
            <FormItemLayout layout="flex-row" label={item.label} description={item.detail}>
              <time className="text-sm tabular-nums text-foreground-muted md:text-right" dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time>
            </FormItemLayout>
          </CardContent>
        ))}
        {activity.length === 0 ? <CardContent><p className="text-sm text-foreground-muted">No recent workspace activity has been recorded.</p></CardContent> : null}
      </Card>
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
