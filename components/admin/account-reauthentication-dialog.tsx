'use client'

import { useId, useState, type ReactNode } from 'react'

import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label } from '@/components/ui'

type AccountStepUpOperation = 'account-delete' | 'account-export'

export function AccountReauthenticationDialog({
  operation,
  trigger,
  onAuthorized,
  disabled = false,
  variant = 'default',
  size,
}: {
  operation: AccountStepUpOperation
  trigger: ReactNode
  onAuthorized: () => void | Promise<void>
  disabled?: boolean
  variant?: 'default' | 'destructive' | 'outline'
  size?: 'small' | 'default' | 'large'
}) {
  const id = useId()
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit() {
    if (!password) {
      setMessage('Enter your password, or use Google below to reauthenticate.')
      return
    }
    setMessage(null)
    setPending(true)
    try {
      const response = await fetch('/api/account/reauthenticate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation, password, ...(mfaCode ? { mfaCode } : {}) }),
      })
      const result = await response.json().catch(() => null) as { error?: string; authenticated?: boolean } | null
      if (result?.error === 'mfa_required') {
        setMfaRequired(true)
        setMessage('Enter the six-digit code from your configured authenticator.')
        return
      }
      if (!response.ok || !result?.authenticated) {
        setMessage(formatReauthenticationError(result?.error))
        return
      }
      await onAuthorized()
    } catch {
      setMessage('Reauthentication is temporarily unavailable. Please try again.')
    } finally {
      setPending(false)
    }
  }

  function continueWithGoogle() {
    window.location.assign(`/api/account/reauthenticate/google?operation=${encodeURIComponent(operation)}`)
  }

  return (
    <Dialog>
      <DialogTrigger variant={variant} size={size} disabled={disabled}>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm your identity</DialogTitle>
          <DialogDescription>This sensitive action requires a fresh authentication check. Your confirmation expires after five minutes and can be used once.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor={`reauth-password-${operation}-${id}`}>Current password</Label>
            <Input id={`reauth-password-${operation}-${id}`} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          {mfaRequired ? <div className="space-y-2"><Label htmlFor={`reauth-mfa-${operation}-${id}`}>MFA code</Label><Input id={`reauth-mfa-${operation}-${id}`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></div> : null}
          <div className="flex items-center gap-3"><div className="h-px flex-1 bg-border" /><span className="text-xs text-foreground-muted">or</span><div className="h-px flex-1 bg-border" /></div>
          <Button type="button" variant="outline" className="w-full" onClick={continueWithGoogle}>Reauthenticate with Google</Button>
          {message ? <p className="text-xs text-destructive" role="alert">{message}</p> : null}
        </div>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <Button type="button" loading={pending} onClick={submit}>{operation === 'account-delete' ? 'Verify and continue' : 'Verify and export'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatReauthenticationError(error?: string) {
  switch (error) {
    case 'invalid_credentials': return 'The password is incorrect.'
    case 'invalid_mfa': return 'That MFA code was not accepted.'
    case 'google_reauthentication_unavailable': return 'Google reauthentication is not available for this account.'
    case 'rate_limited': return 'Too many reauthentication attempts. Try again later.'
    default: return 'Your identity could not be reauthenticated. Please try again.'
  }
}
