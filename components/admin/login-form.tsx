'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'

import { GoogleAuthButton } from '@/components/admin/google-auth-button'
import { Alert, AlertDescription, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/components/ui'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

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
      const supabase = createSupabaseBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError('The email or password is incorrect. Check your credentials and try again.')
        return
      }
      router.replace('/dashboard')
      router.refresh()
    } catch {
      setError('Sign-in is temporarily unavailable. Please try again shortly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="login-card">
      <CardHeader className="login-card-header">
        <div className="login-form-meta">Owner sign-in</div>
        <CardTitle className="login-card-title">Sign in to RepoView</CardTitle>
        <CardDescription className="login-card-description">Manage private repository shares and view activity.</CardDescription>
      </CardHeader>
      <CardContent className="login-card-content">
        <GoogleAuthButton />
        <div className="auth-divider" aria-hidden="true"><span>or continue with email</span></div>
        <form className="login-form" onSubmit={handleSubmit}>
          {error ? <Alert className="login-error" aria-live="polite"><AlertDescription><strong>We couldn&apos;t sign you in.</strong><span>{error}</span></AlertDescription></Alert> : null}
          <div className="login-field">
            <Label htmlFor="email">Email address</Label>
            <div className="login-input-wrap">
              <Input id="email" className="login-input" type="email" autoComplete="email" placeholder="you@company.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
          </div>
          <div className="login-field">
            <Label htmlFor="password">Password</Label>
            <div className="login-input-wrap">
              <Input id="password" className="login-input pr-10" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" required value={password} onChange={(event) => setPassword(event.target.value)} />
              <button className="login-password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
          <Button type="submit" size="large" className="login-submit-button w-full" loading={isSubmitting} iconRight={<ArrowRight className="size-4" aria-hidden="true" />}>
            Sign in
          </Button>
          <p className="login-form-note">Owner account only.</p>
          <p className="login-form-note">Need an account? <Link href="/signup">Create one</Link></p>
        </form>
      </CardContent>
    </Card>
  )
}
