import type { Metadata } from 'next'

import { LoginForm } from '@/components/admin/login-form'
import { LandingFooter, LandingNav } from '@/components/landing/landing-chrome'

export const metadata: Metadata = {
  title: 'Sign in | RepoView',
  description: 'Sign in to manage RepoView shares.',
}

export default function LoginPage() {
  return (
    <main className="landing-page login-page">
      <LandingNav homeHref="/" minimal />
      <div className="login-content">
        <LoginForm />
      </div>
      <LandingFooter homeHref="/" sectionPrefix="/" />
    </main>
  )
}
