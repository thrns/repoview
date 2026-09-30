import type { Metadata } from 'next'

import { LoginForm } from '@/components/admin/login-form'
import { AuthLayout } from '@/components/landing/auth-layout'

export const metadata: Metadata = {
  title: 'Sign in | RepoView',
  description: 'Sign in to manage RepoView shares.',
}

export default function LoginPage() {
  return (
    <AuthLayout
      headline="Code privacy, with insights."
      signals={['Private repository sharing', 'Viewer activity insights', 'Built for focused code review']}
    >
      <LoginForm />
    </AuthLayout>
  )
}
