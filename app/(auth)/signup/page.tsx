import type { Metadata } from 'next'

import { SignupForm } from '@/components/admin/signup-form'
import { AuthLayout } from '@/components/landing/auth-layout'

export const metadata: Metadata = {
  title: 'Create account | RepoView',
  description: 'Create a RepoView owner account to manage private repository shares.',
}

export default function SignupPage() {
  return (
    <AuthLayout
      headline="Share code with confidence."
      signals={['Private repository shares', 'Viewer activity insights', 'A workspace built for you']}
    >
      <SignupForm />
    </AuthLayout>
  )
}
