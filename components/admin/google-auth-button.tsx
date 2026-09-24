'use client'

import { useState } from 'react'

import { Alert, AlertDescription, Button } from '@/components/ui'

interface GoogleAuthButtonProps {
  label?: string
  redirectPath?: string
}

export function GoogleAuthButton({ label = 'Sign in with Google', redirectPath = '/dashboard' }: GoogleAuthButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleSignIn() {
    setError(null)
    setIsSubmitting(true)

    try {
      window.location.assign(`/api/auth/google?next=${encodeURIComponent(redirectPath)}`)
    } catch {
      setError('Google sign-in is unavailable right now. Please try again or use email.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-provider-stack">
      <Button
        type="button"
        variant="outline"
        className="auth-google-button w-full"
        loading={isSubmitting}
        icon={<GoogleMark className="size-4" />}
        onClick={handleGoogleSignIn}
      >
        {label}
      </Button>
      {error ? (
        <Alert className="login-error" aria-live="polite">
          <AlertDescription>
            <strong>We couldn&apos;t connect Google.</strong>
            <span>{error}</span>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.91-4.18 2.91-7.21Z" />
      <path fill="#34A853" d="M12 21.5c2.63 0 4.84-.87 6.46-2.36l-3.14-2.44c-.87.58-1.98.92-3.32.92-2.55 0-4.71-1.72-5.49-4.03H3.27v2.52A9.75 9.75 0 0 0 12 21.5Z" />
      <path fill="#FBBC05" d="M6.51 13.59A5.86 5.86 0 0 1 6.2 12c0-.55.11-1.09.31-1.59V7.89H3.27A9.5 9.5 0 0 0 2.25 12c0 1.48.35 2.88 1.02 4.11l3.24-2.52Z" />
      <path fill="#EA4335" d="M12 6.38c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.42 14.63 2.5 12 2.5a9.75 9.75 0 0 0-8.73 5.39l3.24 2.52C7.29 8.1 9.45 6.38 12 6.38Z" />
    </svg>
  )
}
