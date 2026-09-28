'use client'

import { useState, useTransition } from 'react'
import { Database, Save } from 'lucide-react'

import { updateNotificationSettings } from '@/app/(admin)/dashboard/settings/actions'
import { AccountReauthenticationDialog } from '@/components/admin/account-reauthentication-dialog'
import { SettingsFooter, SettingsFormRow, SettingsSubsection } from '@/components/admin/settings-section'
import { Admonition, Button, Input, Label, Select, Switch } from '@/components/ui'
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
    <div className="space-y-7">
      <SettingsSubsection title="Delivery" description="Choose where workspace alerts go and how often to receive a digest.">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)] sm:gap-6">
          <div className="space-y-2"><Label htmlFor="notification-email">Notification email</Label><Input id="notification-email" type="email" autoComplete="email" placeholder="you@company.com" value={values.destination_email ?? ''} onChange={(event) => setValues((current) => ({ ...current, destination_email: event.target.value, email_verified: false }))} disabled={!canManage} /><p className="text-xs leading-5 text-foreground-muted">Alerts are sent only after this destination is verified. Your confirmed account email is verified automatically.</p>{values.destination_email ? <p className={`text-xs ${values.email_verified ? 'text-success' : 'text-warning'}`}>{values.email_verified ? 'Verified destination' : 'Verification required before alerts are sent'}</p> : null}</div>
          <div className="space-y-2"><Label htmlFor="digest-frequency">Digest frequency</Label><Select id="digest-frequency" value={values.digest_frequency} onChange={(event) => setValues((current) => ({ ...current, digest_frequency: event.target.value as Settings['digest_frequency'] }))} disabled={!canManage}><option value="off">No digest</option><option value="daily">Daily</option><option value="weekly">Weekly</option></Select></div>
        </div>
      </SettingsSubsection>

      <div className="border-t border-border/60 pt-7">
        <SettingsSubsection title="Notification events" description="Choose the activity that should create an individual notification.">
          <div className="divide-y divide-border/60 border-y border-border/60">
            <PreferenceRow label="First confirmed view" detail="Email when a viewer meaningfully opens a share." checked={values.view_opened} disabled={!canManage} onChange={(checked) => setValues((current) => ({ ...current, view_opened: checked }))} />
            <PreferenceRow label="Returning viewer" detail="Include repeat visits in view notifications." checked={values.returning_view} disabled={!canManage} onChange={(checked) => setValues((current) => ({ ...current, returning_view: checked }))} />
            <PreferenceRow label="Download alerts" detail="Notify when a viewer downloads an allowed file." checked={values.download} disabled={!canManage} onChange={(checked) => setValues((current) => ({ ...current, download: checked }))} />
            <PreferenceRow label="Session summary" detail="Send a compact summary when a viewer session ends." checked={values.session_summary} disabled={!canManage} onChange={(checked) => setValues((current) => ({ ...current, session_summary: checked }))} />
            <PreferenceRow label="Security alerts" detail="Receive notices for unusual viewer security signals." checked={values.security_alerts} disabled={!canManage} onChange={(checked) => setValues((current) => ({ ...current, security_alerts: checked }))} />
          </div>
        </SettingsSubsection>
      </div>
      {canManage ? <SettingsFooter>{message ? <span className="text-xs text-foreground-muted" role="status">{message}</span> : null}<Button type="button" variant="primary" loading={pending} icon={<Save className="size-3.5" aria-hidden="true" />} onClick={save}>Save preferences</Button></SettingsFooter> : <p className="mt-7 border-t border-border/60 pt-5 text-right text-xs text-foreground-muted">Only workspace owners and admins can change notification preferences.</p>}
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
    <div className="space-y-7">
      <Admonition type="default" icon={<Database className="size-4 text-foreground-muted" />} description="Viewer analytics are off by default. Necessary security, access, and delivery records continue to support private share protection." className="border-border-secondary bg-surface-200/35" />

      <SettingsSubsection title="Viewer analytics" description="Optional analytics can help you understand how shared repositories are used.">
        <div className="divide-y divide-border/60 border-y border-border/60">
          <SettingsFormRow label="Optional viewer analytics" description="Enable analytics for this workspace.">
            <Switch aria-label="Enable optional viewer analytics" checked={values.analytics_enabled} onChange={(event) => setValues((current) => ({ ...current, analytics_enabled: event.target.checked }))} disabled={!canManage} />
          </SettingsFormRow>
          <SettingsFormRow label="Analytics retention" description="Security and legal records may need to remain longer.">
            <Select id="analytics-retention" className="w-full sm:w-44" value={String(values.analytics_retention_days)} onChange={(event) => setValues((current) => ({ ...current, analytics_retention_days: Number(event.target.value) as Settings['analytics_retention_days'] }))} disabled={!canManage}><option value="30">30 days</option><option value="90">90 days</option><option value="180">180 days</option></Select>
          </SettingsFormRow>
        </div>
      </SettingsSubsection>

      {canManage ? <SettingsFooter>{message ? <span className="text-xs text-foreground-muted" role="status">{message}</span> : null}<Button type="button" variant="outline" loading={pending} icon={<Save className="size-3.5" aria-hidden="true" />} onClick={save}>Save privacy defaults</Button></SettingsFooter> : <p className="mt-7 border-t border-border/60 pt-5 text-right text-xs text-foreground-muted">Only workspace owners and admins can change workspace privacy defaults.</p>}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-x-5 gap-y-2 border-t border-border/60 pt-5 text-xs"><a href="/privacy" className="font-medium underline-offset-4 hover:underline">Privacy Policy</a><a href="/terms" className="font-medium underline-offset-4 hover:underline">Terms</a><AccountReauthenticationDialog className="h-auto min-h-0 rounded-none p-0 text-xs" operation="account-export" variant="text" trigger={<span className="text-foreground-muted underline-offset-4 hover:text-foreground hover:underline">Export data</span>} onAuthorized={() => { window.location.assign('/api/account/export') }} /><span className="border-l border-border pl-5"><a href="mailto:tharunpranav.ubc@gmail.com?subject=RepoView%20data%20deletion%20request" className="text-destructive underline-offset-4 hover:underline">Delete analytics data</a></span></div>
    </div>
  )
}

function PreferenceRow({ label, detail, checked, disabled, onChange }: { label: string; detail: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return <SettingsFormRow label={label} description={detail}><Switch checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} aria-label={label} /></SettingsFormRow>
}

function toInput(settings: Settings) {
  return {
    notificationEmail: settings.destination_email ?? '',
    notifyOnView: settings.view_opened,
    notifyOnReturningView: settings.returning_view,
    notifyOnDownload: settings.download,
    notifyOnSessionSummary: settings.session_summary,
    notifyOnSecurityAlert: settings.security_alerts,
    digestFrequency: settings.digest_frequency,
    analyticsEnabled: settings.analytics_enabled,
    analyticsRetentionDays: settings.analytics_retention_days,
  }
}
