'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowRight, Check, Github, Mail, ShieldCheck } from 'lucide-react'

import { completeOnboardingProfile } from '@/app/onboarding/actions'
import { GitHubConnectionStatusAlert } from '@/components/admin/github-connection-card'
import { Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, Input, Label } from '@/components/ui'
import type { OnboardingState } from '@/lib/auth/onboarding'

const stepLabels = [
  ['verify_email', 'Verify'],
  ['profile', 'Profile'],
  ['github', 'GitHub'],
  ['repositories', 'Repositories'],
  ['share', 'First share'],
] as const

export function OnboardingFlow({ state, githubStatus }: { state: OnboardingState; githubStatus?: string }) {
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

  return (
    <main className="min-h-dvh bg-background px-5 py-10 sm:px-8 lg:px-10 lg:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <header className="space-y-3">
          <Badge variant="outline">Welcome to RepoView</Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Set up your workspace</h1>
          <p className="max-w-2xl text-sm leading-6 text-foreground-muted">A few quick steps and you’ll have a private repository share ready to send.</p>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
          <Card className="overflow-hidden rounded-md border-border/70 shadow-none">
            <CardHeader className="border-b border-border/60">
              <div className="flex items-center gap-2 text-xs text-foreground-muted"><span className="font-mono tabular-nums">{currentStepNumber(state.step)} / {stepLabels.length}</span><span aria-hidden="true">·</span><span>{currentStepLabel(state.step)}</span></div>
              <CardTitle>{getTitle(state)}</CardTitle>
              <CardDescription>{getDescription(state)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              {githubStatus ? <GitHubConnectionStatusAlert status={githubStatus} /> : null}
              {state.step === 'verify_email' ? <VerifyEmailState email={state.userEmail} /> : null}
              {state.step === 'profile' ? (
                <form className="space-y-5" onSubmit={saveProfile}>
                  {error ? <Alert className="border-destructive/40 bg-destructive/5" role="alert"><AlertTitle>Could not save your profile</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-full-name">Full name</Label>
                    <Input id="onboarding-full-name" autoComplete="name" maxLength={100} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Ada Lovelace" required />
                  </div>
                  <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                    <label className="flex items-start gap-3 text-sm leading-5"><Checkbox checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} /><span>I agree to the <Link className="underline underline-offset-2" href="/terms" target="_blank">current Terms of Service</Link>.</span></label>
                    <label className="flex items-start gap-3 text-sm leading-5"><Checkbox checked={acknowledgePrivacy} onChange={(event) => setAcknowledgePrivacy(event.target.checked)} /><span>I acknowledge the <Link className="underline underline-offset-2" href="/privacy" target="_blank">current Privacy Policy</Link>.</span></label>
                  </div>
                  <Button type="submit" loading={isPending} iconRight={<ArrowRight className="size-4" aria-hidden="true" />}>Save and continue</Button>
                </form>
              ) : null}
              {state.step === 'github' ? <GitHubState state={state} /> : null}
              {state.step === 'repositories' ? <RepositoriesState /> : null}
              {state.step === 'share' ? <ShareState /> : null}
            </CardContent>
          </Card>

          <OnboardingChecklist state={state} />
        </div>
      </div>
    </main>
  )
}

function VerifyEmailState({ email }: { email: string }) {
  return (
    <div className="space-y-4">
      <div className="flex size-11 items-center justify-center rounded-md border border-border bg-muted text-primary"><Mail className="size-5" aria-hidden="true" /></div>
      <div className="space-y-2"><p className="text-sm font-medium">Check your inbox</p><p className="text-sm leading-6 text-foreground-muted">Confirm {email || 'your email address'} to continue. Your workspace is saved, so you can come back to this page whenever you’re ready.</p></div>
      <Link href="/login" className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"><span>Back to sign in</span><ArrowRight className="size-4" aria-hidden="true" /></Link>
    </div>
  )
}

function GitHubState({ state }: { state: OnboardingState }) {
  const hasSuspended = state.hasSuspendedGitHubInstallation
  return (
    <div className="space-y-5">
      {state.hasPendingGitHubConnection && !hasSuspended ? <Alert className="border-warning/40 bg-warning/5"><AlertTitle>Organization approval may be pending</AlertTitle><AlertDescription>If an organization owner needs to approve the App, GitHub will finish the connection after approval. You can safely leave this page and return later.</AlertDescription></Alert> : null}
      {hasSuspended ? <Alert className="border-destructive/40 bg-destructive/5"><AlertTitle>GitHub access is suspended</AlertTitle><AlertDescription>Reconnect GitHub or restore the installation in GitHub before selecting repositories.</AlertDescription></Alert> : null}
      <div className="flex items-start gap-3"><Github className="mt-0.5 size-5" aria-hidden="true" /><p className="text-sm leading-6 text-foreground-muted">Connect a personal account or an organization where you can approve App access. RepoView only stores the installation metadata and uses short-lived server-side access tokens.</p></div>
      <a href="/api/github/connect?return=%2Fonboarding" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"><span>Connect GitHub</span><ArrowRight className="size-4" aria-hidden="true" /></a>
    </div>
  )
}

function RepositoriesState() {
  return <div className="space-y-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 text-success" aria-hidden="true" /><p className="text-sm leading-6 text-foreground-muted">Choose the repositories RepoView may use. You can change this selection later in Settings.</p></div><Link href="/dashboard/repositories?onboarding=1" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"><span>Choose repositories</span><ArrowRight className="size-4" aria-hidden="true" /></Link></div>
}

function ShareState() {
  return <div className="space-y-5"><div className="flex items-start gap-3"><Github className="mt-0.5 size-5 text-success" aria-hidden="true" /><p className="text-sm leading-6 text-foreground-muted">Your GitHub connection is ready. Create one share to see the full RepoView workflow.</p></div><Link href="/dashboard/shares/new?onboarding=1" className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"><span>Create first share</span><ArrowRight className="size-4" aria-hidden="true" /></Link></div>
}

function OnboardingChecklist({ state }: { state: OnboardingState }) {
  const current = currentStepNumber(state.step)
  return <aside className="space-y-3 rounded-md border border-border/70 bg-card p-4"><p className="text-xs font-medium uppercase tracking-[0.12em] text-foreground-muted">Getting started</p><ol className="space-y-1">{stepLabels.map(([key, label], index) => { const complete = current > index + 1 || state.step === 'complete'; const active = key === state.step; return <li key={key} className="flex items-center gap-2.5 py-1.5 text-sm"><span className={complete ? 'flex size-5 items-center justify-center rounded-full bg-success text-success-foreground' : active ? 'flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground font-mono text-[10px]' : 'flex size-5 items-center justify-center rounded-full border border-border font-mono text-[10px] text-foreground-muted'}>{complete ? <Check className="size-3" aria-hidden="true" /> : index + 1}</span><span className={active ? 'font-medium text-foreground' : 'text-foreground-muted'}>{label}</span></li> })}</ol></aside>
}

function getTitle(state: OnboardingState) {
  return { verify_email: 'Verify your email', profile: 'Tell us about you', github: 'Connect GitHub', repositories: 'Choose your repositories', share: 'Create your first share', complete: 'Your workspace is ready' }[state.step]
}

function getDescription(state: OnboardingState) {
  return { verify_email: 'One quick confirmation keeps your account secure.', profile: 'This is the name we’ll use for your personal workspace.', github: 'Connect the GitHub account or organization that owns your repositories.', repositories: 'Select what you want to make available for sharing.', share: 'Start with a secure, read-only link.', complete: 'You can now use RepoView.' }[state.step]
}

function currentStepNumber(step: OnboardingState['step']) {
  if (step === 'complete') return stepLabels.length
  const index = stepLabels.findIndex(([key]) => key === step)
  return index < 0 ? 1 : index + 1
}

function currentStepLabel(step: OnboardingState['step']) {
  return step === 'complete' ? 'Ready' : stepLabels.find(([key]) => key === step)?.[1] ?? 'Getting started'
}
