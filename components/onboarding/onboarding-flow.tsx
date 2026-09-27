'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowRight, Check, CheckCircle2, Github, Mail } from 'lucide-react'

import { completeOnboardingProfile } from '@/app/onboarding/actions'
import { GitHubConnectionStatusAlert } from '@/components/admin/github-connection-card'
import { BrandLogo } from '@/components/shared/brand-logo'
import { ThemeSwitcher } from '@/components/shared/theme-switcher'
import { Alert, AlertDescription, AlertTitle, Button, Checkbox, Input, Label } from '@/components/ui'
import type { OnboardingState } from '@/lib/auth/onboarding'

const stepLabels = [
  ['verify_email', 'Verify'],
  ['profile', 'Profile'],
  ['github', 'GitHub'],
] as const

export function OnboardingFlow({ state, githubStatus, repositoryCount }: { state: OnboardingState; githubStatus?: string; repositoryCount?: number }) {
  const router = useRouter()
  const [fullName, setFullName] = useState(state.profile?.full_name ?? '')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acknowledgePrivacy, setAcknowledgePrivacy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await completeOnboardingProfile({ fullName, acceptTerms, acknowledgePrivacy })
        router.refresh()
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Your profile could not be saved.')
      }
    })
  }

  if (state.isComplete && githubStatus === 'success') {
    return <OnboardingSuccess repositoryCount={repositoryCount} />
  }

  return (
    <main className="onboarding-page">
      <OnboardingHeader />
      <div className="onboarding-container">
        <header className="onboarding-intro">
          <p className="onboarding-kicker">Workspace setup</p>
          <h1>Connect RepoView to your workflow.</h1>
          <p>Verify your account, add your name, then connect the GitHub installation that owns the repositories you want to share.</p>
        </header>

        <OnboardingProgress state={state} />

        <section className="onboarding-surface" aria-labelledby="onboarding-step-title">
          <div className="onboarding-step-meta">
            <span>Step {currentStepNumber(state.step)} of {stepLabels.length}</span>
            <span>{currentStepLabel(state.step)}</span>
          </div>
          <h2 id="onboarding-step-title">{getTitle(state)}</h2>
          <p className="onboarding-step-description">{getDescription(state)}</p>

          {githubStatus ? <div className="onboarding-status"><GitHubConnectionStatusAlert status={githubStatus} /></div> : null}
          <div className="onboarding-step-content">
            {state.step === 'verify_email' ? <VerifyEmailState email={state.userEmail} /> : null}
            {state.step === 'profile' ? (
              <form className="onboarding-form" onSubmit={saveProfile}>
                {error ? <Alert className="onboarding-error" role="alert"><AlertTitle>Could not save your profile</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
                <div className="onboarding-field">
                  <Label htmlFor="onboarding-full-name">Full name</Label>
                  <Input id="onboarding-full-name" autoComplete="name" maxLength={100} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ada Lovelace" required />
                </div>
                <div className="onboarding-acknowledgements">
                  <label><Checkbox checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} /><span>I agree to the <Link href="/terms" target="_blank">current Terms of Service</Link>.</span></label>
                  <label><Checkbox checked={acknowledgePrivacy} onChange={(event) => setAcknowledgePrivacy(event.target.checked)} /><span>I acknowledge the <Link href="/privacy" target="_blank">current Privacy Policy</Link>.</span></label>
                </div>
                <Button type="submit" variant="primary" loading={isPending} iconRight={<ArrowRight className="size-4" aria-hidden="true" />}>Save and continue</Button>
              </form>
            ) : null}
            {state.step === 'github' ? <GitHubState state={state} /> : null}
          </div>
        </section>
      </div>
    </main>
  )
}

function OnboardingHeader() {
  return (
    <header className="onboarding-header">
      <Link href="/login" className="onboarding-brand" aria-label="Back to RepoView sign in">
        <BrandLogo size={26} />
        <span>RepoView</span>
      </Link>
      <ThemeSwitcher />
    </header>
  )
}

function OnboardingSuccess({ repositoryCount }: { repositoryCount?: number }) {
  return (
    <main className="onboarding-page">
      <OnboardingHeader />
      <div className="onboarding-container onboarding-success-container">
        <section className="onboarding-complete" aria-labelledby="onboarding-complete-title">
          <span className="onboarding-complete-mark"><CheckCircle2 className="size-6" strokeWidth={2.2} aria-hidden="true" /></span>
          <p className="onboarding-kicker">Workspace setup</p>
          <h1 id="onboarding-complete-title">You&apos;re all set.</h1>
          <p>GitHub is connected and your RepoView workspace is ready.</p>
          {typeof repositoryCount === 'number' ? <span className="onboarding-repository-count">{repositoryCount} {repositoryCount === 1 ? 'repository' : 'repositories'} discovered</span> : null}
          <Link href="/dashboard" className="onboarding-primary-link">Go to dashboard <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </section>
      </div>
    </main>
  )
}

function OnboardingProgress({ state }: { state: OnboardingState }) {
  const current = currentStepNumber(state.step)

  return (
    <ol className="onboarding-progress" aria-label="Workspace setup progress">
      {stepLabels.map(([key, label], index) => {
        const complete = current > index + 1 || state.step === 'complete'
        const active = key === state.step
        return (
          <li key={key} className={active ? 'is-active' : complete ? 'is-complete' : ''} aria-current={active ? 'step' : undefined}>
            <span className="onboarding-progress-marker">{complete ? <Check className="size-3" aria-hidden="true" /> : index + 1}</span>
            <span>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

function VerifyEmailState({ email }: { email: string }) {
  return (
    <div className="onboarding-message">
      <span className="onboarding-message-icon"><Mail className="size-5" aria-hidden="true" /></span>
      <div><h3>Check your inbox</h3><p>Confirm {email || 'your email address'} to continue. Your workspace is saved, so you can come back to this page whenever you&apos;re ready.</p></div>
      <Link href="/login" className="onboarding-secondary-link">Back to sign in <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
    </div>
  )
}

function GitHubState({ state }: { state: OnboardingState }) {
  const hasSuspended = state.hasSuspendedGitHubInstallation

  return (
    <div className="onboarding-github">
      {state.hasPendingGitHubConnection && !hasSuspended ? <Alert className="onboarding-warning"><AlertTitle>Organization approval may be pending</AlertTitle><AlertDescription>If an organization owner needs to approve the App, GitHub will finish the connection after approval. You can safely leave this page and return later.</AlertDescription></Alert> : null}
      {hasSuspended ? <Alert className="onboarding-error"><AlertTitle>GitHub access is suspended</AlertTitle><AlertDescription>Reconnect GitHub or restore the installation in GitHub before selecting repositories.</AlertDescription></Alert> : null}
      <div className="onboarding-github-copy"><Github className="size-5" aria-hidden="true" /><p>Connect a personal account or an organization where you can approve App access. RepoView only stores the installation metadata and uses short-lived server-side access tokens.</p></div>
      <a href="/api/github/connect?return=%2Fonboarding" className="onboarding-primary-link">Connect GitHub <ArrowRight className="size-4" aria-hidden="true" /></a>
    </div>
  )
}

function getTitle(state: OnboardingState) {
  return { verify_email: 'Verify your email', profile: 'Finish your profile', github: 'Connect GitHub', complete: 'Your workspace is ready' }[state.step]
}

function getDescription(state: OnboardingState) {
  return {
    verify_email: 'One quick confirmation keeps your account secure.',
    profile: 'Add the name for your workspace and acknowledge the current Terms and Privacy Policy.',
    github: 'Connect the GitHub account or organization that owns the repositories you want to share.',
    complete: 'You can now use RepoView.',
  }[state.step]
}

function currentStepNumber(step: OnboardingState['step']) {
  if (step === 'complete') return stepLabels.length
  const index = stepLabels.findIndex(([key]) => key === step)
  return index < 0 ? 1 : index + 1
}

function currentStepLabel(step: OnboardingState['step']) {
  return step === 'complete' ? 'Ready' : stepLabels.find(([key]) => key === step)?.[1] ?? 'Getting started'
}
