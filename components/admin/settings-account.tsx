'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert } from 'lucide-react'

import { changePassword, updateProfile } from '@/app/(admin)/dashboard/settings/actions'
import { AccountReauthenticationDialog } from '@/components/admin/account-reauthentication-dialog'
import { Button, Card, CardContent, CardFooter, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, FormItemLayout, Input, Label } from '@/components/ui'
import { getAccountDeletionConfirmation } from '@/lib/account/deletion-shared'

export function SettingsAccount({ fullName, email, emailVerified, reauthStatus, reauthOperation }: { fullName: string; email: string; emailVerified: boolean; reauthStatus?: string; reauthOperation?: string }) {
  const [name, setName] = useState(fullName)
  const [savedName, setSavedName] = useState(fullName)
  const [message, setMessage] = useState<string | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (reauthStatus === 'success' && reauthOperation === 'account-export') {
      window.location.assign('/api/account/export')
    }
  }, [reauthOperation, reauthStatus])

  const dirty = name !== savedName

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextName = name
    setMessage(null)
    setSaved(null)
    setPending(true)
    void updateProfile({ fullName: nextName }).then((result) => {
      setSaved(result.saved)
      setMessage(result.saved ? 'Profile saved.' : result.error)
      if (result.saved) setSavedName(nextName)
    }).catch(() => {
      setSaved(false)
      setMessage('Your profile could not be saved.')
    }).finally(() => setPending(false))
  }

  return (
    <div className="space-y-4">
      <form onSubmit={saveProfile}>
        <Card>
          <CardContent className="pt-6">
            <FormItemLayout layout="flex-row-reverse" label="Full name" description="Update the name shown across your RepoView workspace.">
              <Input id="settings-full-name" className="w-full max-w-md" autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
            </FormItemLayout>
          </CardContent>
          <CardContent>
            <FormItemLayout layout="flex-row-reverse" label="Email" description="This address is used for sign-in and account recovery.">
              <div className="w-full max-w-md space-y-2">
                <Input id="settings-email" value={email} readOnly aria-describedby="settings-email-status" className="bg-muted/35" />
                <div id="settings-email-status" className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  {emailVerified ? <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" /> : <CircleAlert className="size-3.5 text-warning" aria-hidden="true" />}
                  <span>{emailVerified ? 'Verified email address' : 'Email verification required'}</span>
                </div>
              </div>
            </FormItemLayout>
          </CardContent>
          <CardFooter className="flex-wrap justify-end gap-3">
            {message ? <p className={`mr-auto text-sm ${saved ? 'text-success' : 'text-destructive'}`} role="status">{message}</p> : null}
            {dirty ? <Button type="button" variant="outline" size="small" onClick={() => { setName(savedName); setMessage(null); setSaved(null) }}>Cancel</Button> : null}
            <Button type="submit" variant="primary" size="small" loading={pending} disabled={!dirty}>Save changes</Button>
          </CardFooter>
        </Card>
      </form>

      <Card>
        <CardContent className="pt-6">
          <details className="group">
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <FormItemLayout layout="flex-row" label="Change password" description="Update the password for this RepoView account.">
                <span className="text-sm text-foreground-muted group-open:text-foreground">Open</span>
              </FormItemLayout>
            </summary>
            <div className="mt-4">
              <ChangePasswordForm />
            </div>
          </details>
        </CardContent>
        <CardContent>
          <FormItemLayout layout="flex-row-reverse" label="Export account data" description="Download your profile, workspaces, repositories, shares, settings, and relevant analytics.">
            <AccountReauthenticationDialog
              operation="account-export"
              variant="outline"
              size="small"
              trigger="Export JSON"
              onAuthorized={() => { window.location.assign('/api/account/export') }}
            />
          </FormItemLayout>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {reauthStatus === 'success' && reauthOperation === 'account-delete' ? <p className="text-xs text-success" role="status">Reauthentication complete. Reopen the deletion dialog to continue.</p> : null}
        {reauthStatus === 'mfa' && reauthOperation ? <PendingMfaReauthentication operation={reauthOperation} /> : null}
        <Card className="border-destructive/30">
          <CardContent className="pt-6">
            <FormItemLayout layout="flex-row-reverse" label="Delete account" description="Immediately disables your workspace, revokes its shares, disconnects GitHub, and permanently deletes your account data.">
              <DeleteAccountControl email={email} />
            </FormItemLayout>
          </CardContent>
        </Card>
      </div>
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
  )
}

function formatDeletionError(error?: string) {
  switch (error) {
    case 'recent_auth_required': return 'Sign out and sign in again, then retry account deletion.'
    case 'workspace_has_members': return 'Remove or transfer other workspace members before deleting this account.'
    case 'confirmation_required': return 'Type the confirmation phrase exactly as shown.'
    default: return 'Account cleanup could not finish. Your shares remain disabled while you retry.'
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
      else window.location.assign('/dashboard/settings/account?reauth=success&operation=account-delete')
    } catch {
      setMessage('MFA reauthentication is temporarily unavailable.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="rounded-md border border-warning/30 bg-warning/5 p-4">
      <p className="text-sm font-medium">Complete MFA reauthentication</p>
      <p className="mt-1 text-xs leading-5 text-foreground-muted">Enter the six-digit code from your configured authenticator to finish the sensitive account action.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="space-y-2"><Label htmlFor="pending-reauth-mfa">MFA code</Label><Input id="pending-reauth-mfa" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></div>
        <Button type="button" variant="primary" loading={pending} disabled={code.length !== 6} onClick={submit}>Verify MFA</Button>
      </div>
      {message ? <p className="mt-2 text-xs text-destructive" role="alert">{message}</p> : null}
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
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
        <div className="space-y-2"><Label htmlFor="new-password-confirmation">Confirm password</Label><Input id="new-password-confirmation" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {message ? <span className={`mr-auto text-xs ${success ? 'text-success' : 'text-destructive'}`} role="status">{message}</span> : null}
        <Button type="submit" variant="outline" size="small" loading={pending}>Update password</Button>
      </div>
    </form>
  )
}
