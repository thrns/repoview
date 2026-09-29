'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, CircleAlert, Database, LoaderCircle } from 'lucide-react'

import { updateNotificationSettings, updatePrivacySetting } from '@/app/(admin)/dashboard/settings/actions'
import { AccountReauthenticationDialog } from '@/components/admin/account-reauthentication-dialog'
import { Admonition, Button, Card, CardContent, CardFooter, FormItemLayout, Input, Select, Switch } from '@/components/ui'
import type { Tables } from '@/lib/supabase/database.types'

type Settings = Tables<'notification_settings'>

export function SettingsNotifications({ settings, canManage }: { settings: Settings; canManage: boolean }) {
  const [values, setValues] = useState(settings)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function save() {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await updateNotificationSettings(toInput(values))
        setMessage(result.saved ? 'Notification preferences saved.' : result.error)
      } catch {
        setMessage('Notification preferences could not be saved.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <FormItemLayout layout="flex-row" label="Notification email" description={<span className="whitespace-nowrap">Your confirmed sign-in email is used by default. Custom destinations require verification.</span>}>
            <div className="relative w-full max-w-md">
              <Input id="notification-email" type="email" autoComplete="email" placeholder="you@company.com" value={values.destination_email ?? ''} onChange={(event) => setValues((current) => ({ ...current, destination_email: event.target.value, email_verified: false }))} disabled={!canManage} aria-describedby={values.destination_email ? 'notification-email-status' : undefined} className="pr-10" />
              {values.destination_email ? <>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center" aria-hidden="true">
                  {values.email_verified ? <CheckCircle2 className="size-4 text-success" /> : <CircleAlert className="size-4 text-warning" />}
                </span>
                <span id="notification-email-status" className="sr-only">{values.email_verified ? 'Verified destination' : 'Verification required before alerts are sent'}</span>
              </> : null}
            </div>
          </FormItemLayout>
        </CardContent>
        <CardContent>
          <FormItemLayout layout="flex-row" label="Digest frequency" description="Choose how often to receive a summary of workspace activity.">
            <Select id="digest-frequency" className="w-full max-w-48" value={values.digest_frequency} onChange={(event) => setValues((current) => ({ ...current, digest_frequency: event.target.value as Settings['digest_frequency'] }))} disabled={!canManage}>
              <option value="off">No digest</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </Select>
          </FormItemLayout>
        </CardContent>
      </Card>

      <Card>
        <PreferenceRow first label="View opened" detail="Email for every genuine confirmed visit, including repeat visits." checked={values.view_opened} disabled={!canManage} onChange={(checked) => setValues((current) => ({ ...current, view_opened: checked }))} />
        <PreferenceRow label="Download alerts" detail="Notify when a viewer downloads an allowed file." checked={values.download} disabled={!canManage} onChange={(checked) => setValues((current) => ({ ...current, download: checked }))} />
        <PreferenceRow label="Session summary" detail="Send a compact summary when a viewer session ends." checked={values.session_summary} disabled={!canManage} onChange={(checked) => setValues((current) => ({ ...current, session_summary: checked }))} />
        <PreferenceRow label="Security alerts" detail="Receive notices for unusual viewer security signals." checked={values.security_alerts} disabled={!canManage} onChange={(checked) => setValues((current) => ({ ...current, security_alerts: checked }))} />
        <CardFooter className="flex-wrap justify-end gap-3">
          {canManage ? <><span className="mr-auto text-xs text-foreground-muted" role="status">{message}</span><Button type="button" variant="primary" size="small" loading={pending} onClick={save}>Save preferences</Button></> : <p className="ml-auto text-xs text-foreground-muted">Only workspace owners and admins can change notification preferences.</p>}
        </CardFooter>
      </Card>
    </div>
  )
}

export function SettingsPrivacy({ settings, canManage }: { settings: Settings; canManage: boolean }) {
  const [values, setValues] = useState(settings)
  const [analyticsPending, startAnalyticsTransition] = useTransition()
  const [retentionPending, startRetentionTransition] = useTransition()
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  function handleAnalyticsChange(analyticsEnabled: boolean) {
    const previousValue = values.analytics_enabled
    setValues((current) => ({ ...current, analytics_enabled: analyticsEnabled }))
    setMessage(null)
    startAnalyticsTransition(async () => {
      try {
        const result = await updatePrivacySetting({ setting: 'analyticsEnabled', value: analyticsEnabled })
        if (!result.saved) {
          setValues((current) => ({ ...current, analytics_enabled: previousValue }))
          setMessage({ tone: 'error', text: result.error })
          return
        }
        setMessage({ tone: 'success', text: 'Analytics preference saved.' })
      } catch {
        setValues((current) => ({ ...current, analytics_enabled: previousValue }))
        setMessage({ tone: 'error', text: 'Analytics preference could not be saved.' })
      }
    })
  }

  function handleRetentionChange(analyticsRetentionDays: Settings['analytics_retention_days']) {
    const previousValue = values.analytics_retention_days
    setValues((current) => ({ ...current, analytics_retention_days: analyticsRetentionDays }))
    setMessage(null)
    startRetentionTransition(async () => {
      try {
        const result = await updatePrivacySetting({ setting: 'analyticsRetentionDays', value: analyticsRetentionDays })
        if (!result.saved) {
          setValues((current) => ({ ...current, analytics_retention_days: previousValue }))
          setMessage({ tone: 'error', text: result.error })
          return
        }
        setMessage({ tone: 'success', text: 'Retention preference saved.' })
      } catch {
        setValues((current) => ({ ...current, analytics_retention_days: previousValue }))
        setMessage({ tone: 'error', text: 'Retention preference could not be saved.' })
      }
    })
  }

  return (
    <div className="space-y-4">
      <Admonition type="default" icon={<Database className="size-4 text-foreground-muted" />} description="Viewer analytics are off by default. Necessary security, access, and delivery records continue to support private share protection." className="border-border-secondary bg-surface-200/35" />

      <Card>
        <CardContent className="pt-6">
          <FormItemLayout layout="flex-row" label="Optional viewer analytics" description="Enable analytics for this workspace.">
            <div className="flex items-center justify-end gap-2">
              <Switch aria-label="Enable optional viewer analytics" checked={values.analytics_enabled} onChange={(event) => handleAnalyticsChange(event.target.checked)} disabled={!canManage || analyticsPending} aria-busy={analyticsPending} />
              {analyticsPending ? <LoaderCircle className="size-3.5 animate-spin text-foreground-muted" aria-hidden="true" /> : null}
            </div>
          </FormItemLayout>
        </CardContent>
        <CardContent>
          <FormItemLayout layout="flex-row" label="Analytics retention" description="Security and legal records may need to remain longer.">
            <div className="flex items-center justify-end gap-2">
              <Select id="analytics-retention" className="w-full max-w-48" value={String(values.analytics_retention_days)} onChange={(event) => handleRetentionChange(Number(event.target.value) as Settings['analytics_retention_days'])} disabled={!canManage || retentionPending} aria-busy={retentionPending}>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
              </Select>
              {retentionPending ? <LoaderCircle className="size-3.5 shrink-0 animate-spin text-foreground-muted" aria-hidden="true" /> : null}
            </div>
          </FormItemLayout>
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-3">
          <div className="type-label shrink-0 text-foreground" role="heading" aria-level={2}>Actions</div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button asChild variant="outline" size="small"><Link href="/privacy">Privacy Policy</Link></Button>
              <Button asChild variant="outline" size="small"><Link href="/terms">Terms</Link></Button>
              <AccountReauthenticationDialog operation="account-export" variant="outline" size="small" trigger="Export data" onAuthorized={() => { window.location.assign('/api/account/export') }} />
              <Button asChild variant="destructive-outline" size="small"><a href="mailto:tharunpranav.ubc@gmail.com?subject=RepoView%20data%20deletion%20request">Delete analytics data</a></Button>
            </div>
            {message ? <span className={message.tone === 'error' ? 'text-xs text-destructive' : 'text-xs text-success'} role={message.tone === 'error' ? 'alert' : 'status'}>{message.text}</span> : null}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

function PreferenceRow({ first = false, label, detail, checked, disabled, onChange }: { first?: boolean; label: string; detail: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return (
    <CardContent className={first ? 'pt-6' : undefined}>
      <FormItemLayout layout="flex-row" label={label} description={detail}>
        <Switch checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} aria-label={label} />
      </FormItemLayout>
    </CardContent>
  )
}

function toInput(settings: Settings) {
  return {
    notificationEmail: settings.destination_email ?? '',
    notifyOnView: settings.view_opened,
    notifyOnDownload: settings.download,
    notifyOnSessionSummary: settings.session_summary,
    notifyOnSecurityAlert: settings.security_alerts,
    digestFrequency: settings.digest_frequency,
    analyticsEnabled: settings.analytics_enabled,
    analyticsRetentionDays: settings.analytics_retention_days,
  }
}
