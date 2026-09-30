'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'

import { GoogleAuthButton } from '@/components/admin/google-auth-button'
import { Alert, AlertDescription, Button, Input, Label } from '@/components/ui'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        setError('The email or password is incorrect. Check your credentials and try again.')
        return
      }
      router.replace('/dashboard')
    } catch {
      setError('Sign-in is temporarily unavailable. Please try again shortly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-form-stack">
      <div className="auth-form-heading">
        <h1>Sign in</h1>
      </div>
      <GoogleAuthButton label="Continue with Google" />
      <div className="auth-divider"><span>or continue with email</span></div>
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <Alert className="auth-error" aria-live="polite"><AlertDescription><strong>We couldn&apos;t sign you in.</strong><span>{error}</span></AlertDescription></Alert> : null}
        <div className="auth-fields">
          <div className="auth-field">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="auth-field">
            <Label htmlFor="password">Password</Label>
            <div className="auth-password-wrap">
              <Input id="password" className="pr-10" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={(event) => setPassword(event.target.value)} />
              <button className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
        <Button type="submit" variant="primary" size="large" className="button-md w-full" loading={isSubmitting} iconRight={<ArrowRight className="size-4" aria-hidden="true" />}>
          Sign in
        </Button>
        <p className="auth-account-note">Need an account? <Link href="/signup">Create one</Link></p>
      </form>
    </div>
  )
}
