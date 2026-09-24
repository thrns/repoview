'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, CircleAlert, Download, LockKeyhole, Trash2 } from 'lucide-react'

import { updateProfile } from '@/app/(admin)/dashboard/settings/actions'
import { Alert, AlertDescription, Button, Input, Label } from '@/components/ui'

export function SettingsAccount({ fullName, email, emailVerified }: { fullName: string; email: string; emailVerified: boolean }) {
  const [name, setName] = useState(fullName)
  const [message, setMessage] = useState<string | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)
  const [pending, startTransition] = useTransition()

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setSaved(null)
    startTransition(async () => {
      try {
        const result = await updateProfile({ fullName: name })
        setSaved(result.saved)
        setMessage(result.saved ? 'Profile saved.' : result.error)
      } catch {
        setSaved(false)
        setMessage('Your profile could not be saved.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <form className="space-y-4" onSubmit={saveProfile}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="settings-full-name">Full name</Label>
            <Input id="settings-full-name" autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-email">Email</Label>
            <Input id="settings-email" value={email} readOnly aria-describedby="settings-email-status" className="bg-muted/35" />
            <div id="settings-email-status" className="flex items-center gap-1.5 text-xs text-foreground-muted">
              {emailVerified ? <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" /> : <CircleAlert className="size-3.5 text-warning" aria-hidden="true" />}
              <span>{emailVerified ? 'Verified email address' : 'Email verification required'}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={pending}>Save changes</Button>
          {message ? <p className={`text-sm ${saved ? 'text-success' : 'text-destructive'}`} role="status">{message}</p> : null}
        </div>
      </form>

      <div className="divide-y divide-border/70 rounded-md border border-border/70">
        <details className="group">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3"><LockKeyhole className="size-4 text-foreground-muted" aria-hidden="true" /><div><p className="text-sm font-medium">Change password</p><p className="mt-0.5 text-xs text-foreground-muted">Update the password for this RepoView account.</p></div></div>
            <span className="text-xs font-medium text-foreground-muted group-open:text-foreground">Open</span>
          </summary>
          <ChangePasswordForm />
        </details>
        <a href="/api/account/export" className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
          <div className="flex items-center gap-3"><Download className="size-4 text-foreground-muted" aria-hidden="true" /><div><p className="text-sm font-medium">Export account data</p><p className="mt-0.5 text-xs text-foreground-muted">Download your profile, workspace, repository, share, and activity data.</p></div></div>
          <span className="text-xs font-medium text-foreground-muted">JSON</span>
        </a>
      </div>

      <Alert className="border-destructive/25 bg-destructive/5">
        <Trash2 className="size-4" aria-hidden="true" />
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span><strong className="font-medium text-foreground">Delete account</strong><span className="mt-1 block text-xs leading-5">Account deletion removes access and requires workspace ownership checks.</span></span>
          <a href="mailto:tharunpranav.ubc@gmail.com?subject=RepoView%20account%20deletion%20request" className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-destructive/35 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Request deletion</a>
        </AlertDescription>
      </Alert>
    </div>
  )
}

function ChangePasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setSuccess(false)
    if (password.length < 8) {
      setMessage('Use at least 8 characters.')
      return
    }
    if (password !== confirmation) {
      setMessage('The passwords do not match.')
      return
    }
    setPending(true)
    try {
      const { createSupabaseBrowserClient } = await import('@/lib/supabase/client')
      const { error } = await createSupabaseBrowserClient().auth.updateUser({ password })
      if (error) {
        setMessage('The password could not be changed. Sign in again and retry.')
      } else {
        setPassword('')
        setConfirmation('')
        setSuccess(true)
        setMessage('Password changed.')
      }
    } catch {
      setMessage('The password could not be changed. Sign in again and retry.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="grid gap-3 border-t border-border/70 bg-muted/15 px-4 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={submit}>
      <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor="new-password-confirmation">Confirm password</Label><Input id="new-password-confirmation" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
      <div className="flex items-center gap-3"><Button type="submit" variant="outline" loading={pending}>Update password</Button>{message ? <span className={`text-xs ${success ? 'text-success' : 'text-destructive'}`} role="status">{message}</span> : null}</div>
    </form>
  )
}
