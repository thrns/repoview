'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'

import { GoogleAuthButton } from '@/components/admin/google-auth-button'
import { Alert, AlertDescription, Button, Input, Label } from '@/components/ui'

export function SignupForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const normalizedFullName = fullName.trim()
    if (!normalizedFullName) {
      setError('Enter your full name to continue.')
      return
    }

    if (normalizedFullName.length > 100) {
      setError('Keep your full name under 100 characters.')
      return
    }

    if (password.length < 6) {
      setError('Use a password with at least 6 characters.')
      return
    }

    if (password !== passwordConfirmation) {
      setError('The passwords do not match. Check both fields and try again.')
      return
    }

    setIsSubmitting(true)
    setIsComplete(false)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fullName: normalizedFullName, email: email.trim(), password }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null
        setError(formatSignupError(result?.error ?? 'signup_failed'))
        return
      }

      const result = await response.json() as { authenticated?: boolean }
      if (result.authenticated) {
        router.replace('/dashboard')
        return
      }

      setIsComplete(true)
    } catch {
      setError('Sign-up is temporarily unavailable. Please try again shortly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-form-stack">
      <div className="auth-form-heading">
        <h1>Create your account</h1>
      </div>
      {isComplete ? (
        <div className="auth-success" role="status" aria-live="polite">
          <strong>Check your inbox.</strong>
          <p>We sent a confirmation link to <span>{email}</span>. Confirm it to finish creating your account.</p>
          <Link href="/login" className="auth-success-link">Back to sign in <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
        </div>
      ) : (
        <>
          <GoogleAuthButton label="Continue with Google" redirectPath="/onboarding" />
          <div className="auth-divider"><span>or use email</span></div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {error ? <Alert className="auth-error" aria-live="polite"><AlertDescription><strong>We couldn&apos;t create your account.</strong><span>{error}</span></AlertDescription></Alert> : null}
            <div className="auth-fields">
              <div className="auth-field">
                <Label htmlFor="signup-full-name">Full name</Label>
                <Input id="signup-full-name" type="text" autoComplete="name" maxLength={100} placeholder="Ada Lovelace" required value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </div>
              <div className="auth-field">
                <Label htmlFor="signup-email">Email address</Label>
                <Input id="signup-email" type="email" autoComplete="email" placeholder="you@company.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="auth-field">
                <Label htmlFor="signup-password">Password</Label>
                <div className="auth-password-wrap">
                  <Input id="signup-password" className="pr-10" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={6} placeholder="At least 6 characters" required value={password} onChange={(event) => setPassword(event.target.value)} />
                  <button className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>
                    {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div className="auth-field">
                <Label htmlFor="signup-password-confirmation">Confirm password</Label>
                <div className="auth-password-wrap">
                  <Input id="signup-password-confirmation" className="pr-10" type={showPasswordConfirmation ? 'text' : 'password'} autoComplete="new-password" minLength={6} placeholder="Re-enter your password" required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
                  <button className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" aria-label={showPasswordConfirmation ? 'Hide password confirmation' : 'Show password confirmation'} onClick={() => setShowPasswordConfirmation((visible) => !visible)}>
                    {showPasswordConfirmation ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>
            <Button type="submit" variant="primary" size="large" className="button-md w-full" loading={isSubmitting} iconRight={<ArrowRight className="size-4" aria-hidden="true" />}>
              Create account
            </Button>
            <div className="auth-form-footer">
              <p className="auth-legal-note">By creating an account, you agree to the <Link href="/terms">Terms</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</p>
              <p className="auth-account-note">Already have an account? <Link href="/login">Sign in</Link></p>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

function formatSignupError(message: string) {
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('already registered') || normalizedMessage.includes('already exists')) {
    return 'This email is already registered. Try signing in instead.'
  }

  if (normalizedMessage.includes('password')) {
    return 'Choose a stronger password and try again.'
  }

  if (normalizedMessage.includes('rate limit') || normalizedMessage.includes('rate_limited')) {
    return 'Too many sign-up attempts. Please wait a moment and try again.'
  }

  return 'Check your email and password, then try again.'
}
