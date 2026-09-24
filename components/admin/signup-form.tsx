'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'

import { GoogleAuthButton } from '@/components/admin/google-auth-button'
import { Alert, AlertDescription, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/components/ui'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

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
      const supabase = createSupabaseBrowserClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: normalizedFullName,
          },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      })

      if (signUpError) {
        setError(formatSignupError(signUpError.message))
        return
      }

      if (data.session) {
        router.replace('/dashboard')
        router.refresh()
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
    <Card className="login-card">
      <CardHeader className="login-card-header">
        <div className="login-form-meta">Workspace sign-up</div>
        <CardTitle className="login-card-title">Create your RepoView account</CardTitle>
        <CardDescription className="login-card-description">Create a personal workspace for private repository shares and viewer activity.</CardDescription>
      </CardHeader>
      <CardContent className="login-card-content">
        {isComplete ? (
          <div className="signup-success" role="status" aria-live="polite">
            <strong>Check your inbox.</strong>
            <p>We sent a confirmation link to <span>{email}</span>. Confirm it to finish creating your account.</p>
            <Link href="/login" className="signup-success-link">Back to sign in <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
          </div>
        ) : (
          <>
            <GoogleAuthButton label="Continue with Google" redirectPath="/onboarding" />
            <div className="auth-divider" aria-hidden="true"><span>or use email</span></div>
            <form className="login-form" onSubmit={handleSubmit}>
              {error ? <Alert className="login-error" aria-live="polite"><AlertDescription><strong>We couldn&apos;t create your account.</strong><span>{error}</span></AlertDescription></Alert> : null}
              <div className="login-field">
                <Label htmlFor="signup-full-name">Full name</Label>
                <Input id="signup-full-name" className="login-input" type="text" autoComplete="name" maxLength={100} placeholder="Ada Lovelace" required value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </div>
              <div className="login-field">
                <Label htmlFor="signup-email">Email address</Label>
                <Input id="signup-email" className="login-input" type="email" autoComplete="email" placeholder="you@company.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="login-field">
                <Label htmlFor="signup-password">Password</Label>
                <div className="login-input-wrap">
                  <Input id="signup-password" className="login-input pr-10" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={6} placeholder="At least 6 characters" required value={password} onChange={(event) => setPassword(event.target.value)} />
                  <button className="login-password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>
                    {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div className="login-field">
                <Label htmlFor="signup-password-confirmation">Confirm password</Label>
                <div className="login-input-wrap">
                  <Input id="signup-password-confirmation" className="login-input pr-10" type={showPasswordConfirmation ? 'text' : 'password'} autoComplete="new-password" minLength={6} placeholder="Re-enter your password" required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
                  <button className="login-password-toggle" type="button" aria-label={showPasswordConfirmation ? 'Hide password confirmation' : 'Show password confirmation'} onClick={() => setShowPasswordConfirmation((visible) => !visible)}>
                    {showPasswordConfirmation ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <Button type="submit" size="large" className="login-submit-button w-full" loading={isSubmitting} iconRight={<ArrowRight className="size-4" aria-hidden="true" />}>
                Create account
              </Button>
              <p className="login-form-note">After you verify your email, RepoView will ask you to accept the current <Link href="/terms">Terms</Link> and acknowledge the <Link href="/privacy">Privacy Policy</Link>.</p>
              <p className="login-form-note">Already have an account? <Link href="/login">Sign in</Link></p>
            </form>
          </>
        )}
      </CardContent>
    </Card>
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

  if (normalizedMessage.includes('rate limit')) {
    return 'Too many sign-up attempts. Please wait a moment and try again.'
  }

  return 'Check your email and password, then try again.'
}
