'use client'

import { useState, useTransition } from 'react'
import { BarChart3, Database, Mail, Save } from 'lucide-react'

import { updateNotificationSettings } from '@/app/(admin)/dashboard/settings/actions'
import { Button, Checkbox, Input, Label, Select } from '@/components/ui'
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
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div className="space-y-2"><Label htmlFor="notification-email">Notification email</Label><Input id="notification-email" type="email" autoComplete="email" placeholder="you@company.com" value={values.notification_email ?? ''} onChange={(event) => setValues((current) => ({ ...current, notification_email: event.target.value }))} disabled={!canManage} /><p className="text-xs leading-5 text-foreground-muted">Used for workspace activity alerts. It is never shown to viewers.</p></div>
        <div className="space-y-2"><Label htmlFor="digest-frequency">Digest frequency</Label><Select id="digest-frequency" value={values.digest_frequency} onChange={(event) => setValues((current) => ({ ...current, digest_frequency: event.target.value as Settings['digest_frequency'] }))} disabled={!canManage}><option value="off">No digest</option><option value="daily">Daily</option><option value="weekly">Weekly</option></Select></div>
      </div>
      <div className="divide-y divide-border/60 rounded-md border border-border/70">
        <PreferenceRow label="First confirmed view" detail="Email when a viewer meaningfully opens a share." checked={values.notify_on_view} disabled={!canManage} onChange={(checked) => setValues((current) => ({ ...current, notify_on_view: checked }))} />
        <PreferenceRow label="Returning viewer" detail="Include repeat visits in view notifications." checked={values.notify_on_returning_view} disabled={!canManage} onChange={(checked) => setValues((current) => ({ ...current, notify_on_returning_view: checked }))} />
        <PreferenceRow label="Download alerts" detail="Notify when a viewer downloads an allowed file." checked={values.notify_on_download} disabled={!canManage} onChange={(checked) => setValues((current) => ({ ...current, notify_on_download: checked }))} />
        <PreferenceRow label="Session summary" detail="Send a compact summary when a viewer session ends." checked={values.notify_on_session_summary} disabled={!canManage} onChange={(checked) => setValues((current) => ({ ...current, notify_on_session_summary: checked }))} />
        <PreferenceRow label="Security alerts" detail="Receive notices for unusual viewer security signals." checked={values.notify_on_security_alert} disabled={!canManage} onChange={(checked) => setValues((current) => ({ ...current, notify_on_security_alert: checked }))} />
      </div>
      {canManage ? <div className="flex flex-wrap items-center gap-3"><Button type="button" loading={pending} icon={<Save className="size-3.5" aria-hidden="true" />} onClick={save}>Save preferences</Button>{message ? <span className="text-xs text-foreground-muted" role="status">{message}</span> : null}</div> : <p className="text-xs text-foreground-muted">Only workspace owners and admins can change notification preferences.</p>}
    </div>
  )
}

export function SettingsPrivacy({ settings, canManage }: { settings: Settings; canManage: boolean }) {
  const [values, setValues] = useState(settings)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function save() {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await updateNotificationSettings(toInput(values))
        setMessage(result.saved ? 'Privacy defaults saved.' : result.error)
      } catch {
        setMessage('Privacy defaults could not be saved.')
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-md border border-border/70 bg-muted/15 p-4"><Database className="mt-0.5 size-4 shrink-0 text-foreground-muted" aria-hidden="true" /><p className="text-sm leading-6 text-foreground-muted">Viewer analytics are off by default. Necessary security, access, and delivery records continue to support private share protection.</p></div>
      <div className="flex flex-col gap-4 rounded-md border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><BarChart3 className="mt-0.5 size-4 text-foreground-muted" aria-hidden="true" /><div><p className="text-sm font-medium">Optional viewer analytics</p><p className="mt-1 text-xs leading-5 text-foreground-muted">Enable analytics for this workspace and choose how long they are retained.</p></div></div><Checkbox aria-label="Enable optional viewer analytics" checked={values.analytics_enabled} onChange={(event) => setValues((current) => ({ ...current, analytics_enabled: event.target.checked }))} disabled={!canManage} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="analytics-retention">Analytics retention</Label><Select id="analytics-retention" value={String(values.analytics_retention_days)} onChange={(event) => setValues((current) => ({ ...current, analytics_retention_days: Number(event.target.value) as Settings['analytics_retention_days'] }))} disabled={!canManage}><option value="30">30 days</option><option value="90">90 days</option><option value="180">180 days</option><option value="365">1 year</option></Select><p className="text-xs leading-5 text-foreground-muted">Security and legal records may need to remain longer.</p></div></div>
      {canManage ? <div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" loading={pending} icon={<Save className="size-3.5" aria-hidden="true" />} onClick={save}>Save privacy defaults</Button>{message ? <span className="text-xs text-foreground-muted" role="status">{message}</span> : null}</div> : <p className="text-xs text-foreground-muted">Only workspace owners and admins can change workspace privacy defaults.</p>}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-4 text-xs"><a href="/privacy" className="font-medium underline-offset-4 hover:underline">Privacy Policy</a><a href="/terms" className="font-medium underline-offset-4 hover:underline">Terms</a><a href="/api/account/export" className="inline-flex items-center gap-1.5 text-foreground-muted underline-offset-4 hover:text-foreground hover:underline"><Mail className="size-3.5" aria-hidden="true" />Export data</a><a href="mailto:tharunpranav.ubc@gmail.com?subject=RepoView%20data%20deletion%20request" className="text-destructive underline-offset-4 hover:underline">Delete analytics data</a></div>
    </div>
  )
}

function PreferenceRow({ label, detail, checked, disabled, onChange }: { label: string; detail: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center justify-between gap-4 px-4 py-3.5"><span className="min-w-0"><span className="block text-sm font-medium">{label}</span><span className="mt-0.5 block text-xs leading-5 text-foreground-muted">{detail}</span></span><Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} aria-label={label} /></label>
}

function toInput(settings: Settings) {
  return {
    notificationEmail: settings.notification_email ?? '',
    notifyOnView: settings.notify_on_view,
    notifyOnReturningView: settings.notify_on_returning_view,
    notifyOnDownload: settings.notify_on_download,
    notifyOnSessionSummary: settings.notify_on_session_summary,
    notifyOnSecurityAlert: settings.notify_on_security_alert,
    digestFrequency: settings.digest_frequency,
    analyticsEnabled: settings.analytics_enabled,
    analyticsRetentionDays: settings.analytics_retention_days,
  }
}
