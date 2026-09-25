'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckCircle2, CircleAlert, Download, LockKeyhole, Trash2 } from 'lucide-react'

import { changePassword, updateProfile } from '@/app/(admin)/dashboard/settings/actions'
import { AccountReauthenticationDialog } from '@/components/admin/account-reauthentication-dialog'
import { Alert, AlertDescription, Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label } from '@/components/ui'
import { getAccountDeletionConfirmation } from '@/lib/account/deletion-shared'

export function SettingsAccount({ fullName, email, emailVerified, reauthStatus, reauthOperation }: { fullName: string; email: string; emailVerified: boolean; reauthStatus?: string; reauthOperation?: string }) {
  const [name, setName] = useState(fullName)
  const [message, setMessage] = useState<string | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (reauthStatus === 'success' && reauthOperation === 'account-export') {
      window.location.assign('/api/account/export')
    }
  }, [reauthOperation, reauthStatus])

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
        <AccountReauthenticationDialog operation="account-export" trigger={<span className="flex w-full items-center justify-between gap-4 text-left"><span className="flex items-center gap-3"><Download className="size-4 text-foreground-muted" aria-hidden="true" /><span><span className="block text-sm font-medium">Export account data</span><span className="mt-0.5 block text-xs text-foreground-muted">Download your profile, workspaces, repositories, shares, recipient metadata, settings, and relevant analytics.</span></span></span><span className="text-xs font-medium text-foreground-muted">JSON</span></span>} onAuthorized={() => { window.location.assign('/api/account/export') }} />
      </div>

      {reauthStatus === 'success' && reauthOperation === 'account-delete' ? <p className="text-xs text-success" role="status">Reauthentication complete. Reopen the deletion dialog to continue.</p> : null}
      {reauthStatus === 'mfa' && reauthOperation ? <PendingMfaReauthentication operation={reauthOperation} /> : null}
      <DeleteAccountControl email={email} />
    </div>
  )
}

function DeleteAccountControl({ email }: { email: string }) {
  const confirmation = getAccountDeletionConfirmation(email)
  const [value, setValue] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function deleteAccount() {
    if (value !== confirmation) return
    setMessage(null)
    setPending(true)
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ confirmation: value }),
      })
      const result = await response.json().catch(() => null) as { error?: string; queued?: boolean } | null
      if (!response.ok || !result?.queued) {
        setMessage(formatDeletionError(result?.error))
        return
      }
      window.location.assign('/login?deletion=queued')
    } catch {
      setMessage('Account cleanup could not be queued. Your shares remain disabled while you retry.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Alert className="border-destructive/25 bg-destructive/5">
      <Trash2 className="size-4" aria-hidden="true" />
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span><strong className="font-medium text-foreground">Delete account</strong><span className="mt-1 block text-xs leading-5">Immediately disables your workspace, revokes its shares, disconnects GitHub, and permanently deletes your account data.</span></span>
        <Dialog>
          <DialogTrigger variant="destructive" size="small">Delete account</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your RepoView account?</DialogTitle>
              <DialogDescription>This is permanent. Your personal workspace will be disabled immediately, all active shares will stop working, GitHub connections will be forgotten, and account-owned metadata and analytics will be deleted.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4 text-sm">
              <p className="text-foreground-muted">For safety, reauthenticate immediately before deletion and type this phrase exactly:</p>
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">{confirmation}</p>
              <div className="space-y-2">
                <Label htmlFor="delete-account-confirmation">Confirmation phrase</Label>
                <Input id="delete-account-confirmation" autoComplete="off" spellCheck={false} value={value} onChange={(event) => setValue(event.target.value)} placeholder={confirmation} />
              </div>
              {message ? <p className="text-xs text-destructive" role="alert">{message}</p> : null}
            </div>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <AccountReauthenticationDialog operation="account-delete" trigger="Permanently delete" variant="destructive" disabled={value !== confirmation || pending} onAuthorized={deleteAccount} />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AlertDescription>
    </Alert>
  )
}

function formatDeletionError(error?: string) {
  switch (error) {
    case 'recent_auth_required':
      return 'Sign out and sign in again, then retry account deletion.'
    case 'workspace_has_members':
      return 'Remove or transfer other workspace members before deleting this account.'
    case 'confirmation_required':
      return 'Type the confirmation phrase exactly as shown.'
    default:
      return 'Account cleanup could not finish. Your shares remain disabled while you retry.'
  }
}

function PendingMfaReauthentication({ operation }: { operation: string }) {
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit() {
    setPending(true)
    setMessage(null)
    try {
      const response = await fetch('/api/account/reauthenticate/mfa', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation, code }),
      })
      const result = await response.json().catch(() => null) as { error?: string; authenticated?: boolean } | null
      if (!response.ok || !result?.authenticated) {
        setMessage(result?.error === 'invalid_mfa' ? 'That MFA code was not accepted.' : 'MFA reauthentication could not be completed.')
        return
      }
      if (operation === 'account-export') window.location.assign('/api/account/export')
      else window.location.assign('/dashboard/settings?reauth=success&operation=account-delete')
    } catch {
      setMessage('MFA reauthentication is temporarily unavailable.')
    } finally {
      setPending(false)
    }
  }

  return <div className="rounded-md border border-warning/30 bg-warning/5 p-4"><p className="text-sm font-medium">Complete MFA reauthentication</p><p className="mt-1 text-xs leading-5 text-foreground-muted">Enter the six-digit code from your configured authenticator to finish the sensitive account action.</p><div className="mt-3 flex flex-wrap items-end gap-3"><div className="space-y-2"><Label htmlFor="pending-reauth-mfa">MFA code</Label><Input id="pending-reauth-mfa" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></div><Button type="button" loading={pending} disabled={code.length !== 6} onClick={submit}>Verify MFA</Button></div>{message ? <p className="mt-2 text-xs text-destructive" role="alert">{message}</p> : null}</div>
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
      const result = await changePassword({ password })
      if (!result.changed) {
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
