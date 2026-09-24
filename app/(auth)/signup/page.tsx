import type { Metadata } from 'next'

import { SignupForm } from '@/components/admin/signup-form'
import { LandingFooter, LandingNav } from '@/components/landing/landing-chrome'

export const metadata: Metadata = {
  title: 'Create account | RepoView',
  description: 'Create a RepoView owner account to manage private repository shares.',
}

export default function SignupPage() {
  return (
    <main className="landing-page login-page">
      <LandingNav homeHref="/" minimal />
      <div className="login-content">
        <SignupForm />
      </div>
      <LandingFooter homeHref="/" sectionPrefix="/" />
    </main>
  )
}
