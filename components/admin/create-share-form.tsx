'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ChevronDown, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { createShare } from '@/app/(admin)/dashboard/shares/new/actions'
import { Alert, AlertDescription, AlertTitle, Button, Input, Label, Select, Textarea } from '@/components/ui'

export interface ShareFormRepository {
  id: string
  fullName: string
  defaultBranch: string
  branches: string[]
}

interface CreateShareFormProps {
  repositories: ShareFormRepository[]
  onboarding?: boolean
}

export function CreateShareForm({ repositories, onboarding = false }: CreateShareFormProps) {
  const router = useRouter()
  const [repositoryId, setRepositoryId] = useState(repositories[0]?.id ?? '')
  const [shareType, setShareType] = useState<'generic' | 'recipient'>('recipient')
  const [recipientLabel, setRecipientLabel] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [roleNotes, setRoleNotes] = useState('')
  const [ref, setRef] = useState(repositories[0]?.defaultBranch ?? '')
  const [expiry, setExpiry] = useState('never')
  const [notifyOnView, setNotifyOnView] = useState(true)
  const [allowDownload, setAllowDownload] = useState(false)
  const [note, setNote] = useState('')
  const [hidden, setHidden] = useState('')
  const [allowOnly, setAllowOnly] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [createdShareUrl, setCreatedShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const selectedRepository = repositories.find((repository) => repository.id === repositoryId)
  const visibilityFeedback = getVisibilityFeedback(hidden, allowOnly)

  function changeRepository(nextRepositoryId: string) {
    const nextRepository = repositories.find((repository) => repository.id === nextRepositoryId)
    setRepositoryId(nextRepositoryId)
    setRef(nextRepository?.defaultBranch ?? '')
    setError(null)
    setSuccess(null)
    setCopied(false)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (visibilityFeedback.error) {
      setError(visibilityFeedback.error)
      return
    }

    startTransition(async () => {
      try {
        const result = await createShare({
          repositoryId,
          shareType,
          recipientLabel,
          recipientName,
          company,
          email,
          roleNotes,
          ref,
          expiresAt: expiryToIso(expiry),
          notifyOnView,
          allowDownload,
          note,
          hidden: toPatterns(hidden),
          allowOnly: toPatterns(allowOnly),
        })
        setCreatedShareUrl(result.shareUrl)
        setSuccess(`Created a share for ${result.repository} at ${result.ref}. This URL is shown only once.`)
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Share details could not be validated.')
      }
    })
  }

  function resetForAnotherShare() {
    setCreatedShareUrl(null)
    setSuccess(null)
    setCopied(false)
    setRecipientLabel('')
    setShareType('recipient')
    setRecipientName('')
    setCompany('')
    setEmail('')
    setRoleNotes('')
    setNote('')
    setHidden('')
    setAllowOnly('')
    setExpiry('never')
    setNotifyOnView(true)
    setAllowDownload(false)
    setRef(repositories[0]?.defaultBranch ?? '')
  }

  if (repositories.length === 0) {
    return <Alert><AlertTitle>No enabled repositories</AlertTitle><AlertDescription>Enable a repository before creating a share. Return to the repositories dashboard to choose one.</AlertDescription></Alert>
  }

  return (
    <form className="space-y-9 pb-28" onSubmit={submit}>
      {error ? <Alert className="border-destructive/40" role="alert"><AlertTitle>Check these details</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {success ? <Alert className="border-success/40" role="status"><AlertTitle>Share created</AlertTitle><AlertDescription>{success}</AlertDescription></Alert> : null}

      {createdShareUrl ? <OneTimeShareResult url={createdShareUrl} copied={copied} onboarding={onboarding} onCopied={() => setCopied(true)} onContinue={() => router.replace('/dashboard')} onCreateAnother={resetForAnotherShare} /> : null}

      <FormSection title="Repository" description="Choose the source and exact ref this link should expose.">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.45fr)_minmax(0,0.9fr)]">
          <Field label="Repository" htmlFor="share-repository">
            <Select id="share-repository" value={repositoryId} onChange={(event) => changeRepository(event.target.value)}>
              {repositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.fullName}</option>)}
            </Select>
          </Field>
          <Field label="Branch or ref" htmlFor="share-ref">
            <Select id="share-ref" value={ref} onChange={(event) => setRef(event.target.value)}>
              {(selectedRepository?.branches ?? []).map((branch) => <option key={branch} value={branch}>{branch}</option>)}
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Recipient" description="Use a label to keep the share easy to recognize later.">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.45fr)_minmax(0,0.9fr)]">
          <Field label={<><span>Recipient label</span> <span className="font-normal text-foreground-muted">(optional)</span></>} htmlFor="share-recipient-name" help="A user-provided label for your records, not a verified identity.">
            <Input id="share-recipient-name" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Jane Smith" aria-describedby="share-recipient-name-help" />
          </Field>
          <Field label="Link type" htmlFor="share-type">
            <Select id="share-type" value={shareType} onChange={(event) => setShareType(event.target.value as 'generic' | 'recipient')}>
              <option value="recipient">Recipient-labelled</option>
              <option value="generic">Generic anonymous</option>
            </Select>
          </Field>
        </div>

        <details className="group mt-5 border-t border-border/70 pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span>{shareType === 'recipient' ? 'Add recipient details' : 'Add a note'} <span className="font-normal text-foreground-muted">(optional)</span></span>
            <ChevronDown className="size-4 text-foreground-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {shareType === 'recipient' ? <>
              <Field label="Company" htmlFor="share-company">
                <Input id="share-company" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Stripe" />
              </Field>
              <Field label="Email" htmlFor="share-email">
                <Input id="share-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jane@stripe.com" />
              </Field>
              <Field label="Internal label" htmlFor="share-label">
                <Input id="share-label" value={recipientLabel} onChange={(event) => setRecipientLabel(event.target.value)} placeholder="Staff engineer interview" />
              </Field>
              <Field label="Role / application notes" htmlFor="share-role-notes">
                <Input id="share-role-notes" value={roleNotes} onChange={(event) => setRoleNotes(event.target.value)} placeholder="Platform team" />
              </Field>
            </> : null}
            <Field className="sm:col-span-2" label="General note" htmlFor="share-note">
              <Textarea id="share-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Context for this share" rows={3} />
            </Field>
          </div>
        </details>
      </FormSection>

      <FormSection title="Access" description="Keep the link read-only and choose which owner signals to receive.">
        <div className="mb-4 max-w-[18rem]">
          <Field label="Expiry" htmlFor="share-expiry">
            <Select id="share-expiry" value={expiry} onChange={(event) => setExpiry(event.target.value)}>
              <option value="never">Never</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </Select>
          </Field>
        </div>
        <div className="divide-y divide-border/70 border-y border-border/70">
          <ToggleRow checked={notifyOnView} onChange={setNotifyOnView} title="Notify on meaningful view" description="One owner notification after a real browser session is confirmed." />
          <ToggleRow checked={allowDownload} onChange={setAllowDownload} title="Allow downloads" description="Let this recipient download files from the shared repository." />
        </div>
      </FormSection>

      <section className="border-t border-border/70 pt-6">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span><span className="block">Advanced visibility rules</span><span className="mt-1 block text-xs font-normal text-foreground-muted">Further narrow which paths can appear in this share.</span></span>
            <ChevronDown className="size-4 text-foreground-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-5 grid gap-5 border-t border-border/70 pt-5 sm:grid-cols-2">
            <Field label="Hidden paths" htmlFor="share-hidden" help="Never fetched for a viewer. Example: **/private/** or **/.env*">
              <Textarea id="share-hidden" value={hidden} onChange={(event) => setHidden(event.target.value)} placeholder="**/private/**" rows={4} aria-describedby="share-hidden-help" />
            </Field>
            <Field label="Only allow paths" htmlFor="share-allow-only" help="When set, a path must match at least one pattern. Example: src/** or docs/**">
              <Textarea id="share-allow-only" value={allowOnly} onChange={(event) => setAllowOnly(event.target.value)} placeholder="src/**\ndocs/**" rows={4} aria-describedby="share-allow-only-help" />
            </Field>
          </div>
          {visibilityFeedback.warning ? <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-700/30 bg-amber-500/5 px-3 py-2.5 text-xs leading-5 text-amber-800 dark:text-amber-300" role="status"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span>{visibilityFeedback.warning}</span></div> : null}
          {visibilityFeedback.error ? <p className="mt-4 text-xs leading-5 text-destructive" role="alert">{visibilityFeedback.error}</p> : null}
        </details>
      </section>

      <div className="sticky bottom-0 z-10 -mx-5 border-t border-border/80 bg-background/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-xs leading-5">
            <p className="font-medium text-foreground">Ready to create</p>
            <p className="truncate text-foreground-muted" title={`${selectedRepository?.fullName ?? 'No repository'} · ${ref || 'No ref'} · ${expiryLabel(expiry)} · ${allowDownload ? 'Downloads allowed' : 'Downloads off'}`}>
              {selectedRepository?.fullName ?? 'No repository'} <span className="px-1 text-foreground-muted/60">·</span> {ref || 'No ref'} <span className="px-1 text-foreground-muted/60">·</span> {expiryLabel(expiry)} <span className="px-1 text-foreground-muted/60">·</span> {allowDownload ? 'Downloads allowed' : 'Downloads off'}
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
            <Link href="/dashboard/shares" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium text-foreground-muted transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-3.5" aria-hidden="true" /> Back</Link>
            <Button type="submit" variant="primary" loading={isPending}>{createdShareUrl ? 'Create another share' : 'Create share'}</Button>
          </div>
        </div>
      </div>
    </form>
  )
}

function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="border-t border-border/70 pt-6"><div className="mb-4"><h2 className="font-heading text-sm font-semibold tracking-[-0.01em]">{title}</h2><p className="mt-1 text-xs leading-5 text-foreground-muted">{description}</p></div>{children}</section>
}

function Field({ label, htmlFor, help, className, children }: { label: ReactNode; htmlFor: string; help?: string; className?: string; children: ReactNode }) {
  const helpId = `${htmlFor}-help`
  return <div className={`space-y-1.5 ${className ?? ''}`}><Label htmlFor={htmlFor}>{label}</Label>{children}{help ? <p id={helpId} className="text-xs leading-5 text-foreground-muted">{help}</p> : null}</div>
}

function ToggleRow({ checked, onChange, title, description }: { checked: boolean; onChange: (checked: boolean) => void; title: string; description: string }) {
  return <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex min-h-[68px] w-full items-center justify-between gap-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
    <span className="min-w-0"><span className="block text-sm font-medium">{title}</span><span className="mt-0.5 block text-xs leading-5 text-foreground-muted">{description}</span></span>
    <span className={`relative flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${checked ? 'border-foreground bg-foreground' : 'border-input bg-muted'}`} aria-hidden="true"><span className={`absolute left-0.5 size-3.5 rounded-full bg-background shadow-sm transition-transform ${checked ? 'translate-x-4' : ''}`} /></span>
  </button>
}

function OneTimeShareResult({ url, copied, onboarding, onCopied, onContinue, onCreateAnother }: { url: string; copied: boolean; onboarding: boolean; onCopied: () => void; onContinue: () => void; onCreateAnother: () => void }) {
  async function copyUrl() {
    await navigator.clipboard.writeText(url)
    onCopied()
  }

  return (
    <div className="space-y-4 rounded-lg border border-success/40 bg-success/5 p-4">
      <div>
        <p className="text-sm font-medium">Save this link now</p>
        <p className="mt-1 text-sm text-foreground-muted">This exact URL cannot be recovered because RepoView stores only its hash. It will not be shown again after you leave this page.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={url} aria-label="New share URL" className="font-mono text-xs" />
        <Button type="button" variant="outline" onClick={copyUrl}>{copied ? 'Copied' : 'Copy link'}</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {onboarding ? <Button type="button" variant="primary" onClick={onContinue}>Continue to dashboard</Button> : null}
        <Button type="button" variant="text" onClick={onCreateAnother}>Create another share</Button>
      </div>
    </div>
  )
}

function toPatterns(value: string) {
  return value.split('\n').map((pattern) => pattern.trim()).filter(Boolean)
}

function getVisibilityFeedback(hiddenValue: string, allowOnlyValue: string) {
  const hiddenPatterns = toPatterns(hiddenValue)
  const allowOnlyPatterns = toPatterns(allowOnlyValue)

  const invalidPattern = [...hiddenPatterns, ...allowOnlyPatterns].find((pattern) => !hasBalancedGlobDelimiters(pattern))
  if (invalidPattern) return { error: `“${invalidPattern}” has unbalanced glob delimiters.`, warning: null }

  const hidesEverything = hiddenPatterns.some((pattern) => pattern === '**/*' || pattern === '**/**')
  const allAllowedPathsHidden = allowOnlyPatterns.length > 0 && allowOnlyPatterns.every((allowPattern) => hiddenPatterns.some((hiddenPattern) => patternCovers(hiddenPattern, allowPattern)))
  if (hidesEverything || allAllowedPathsHidden) return { error: 'These rules would leave no visible files. Remove the broad hidden rule or add an allow-only path that remains visible.', warning: null }

  const overlaps = hiddenPatterns.some((hiddenPattern) => allowOnlyPatterns.some((allowPattern) => patternsOverlap(hiddenPattern, allowPattern)))
  return overlaps ? { error: null, warning: 'Some paths match both lists. Hidden paths take precedence, so review the overlap before creating the share.' } : { error: null, warning: null }
}

function patternCovers(hiddenPattern: string, allowPattern: string) {
  const hidden = normalizePattern(hiddenPattern)
  const allow = normalizePattern(allowPattern)
  if (hidden === allow || hidden === '**/*' || hidden === '**/**') return true
  const hiddenPrefix = staticPatternPrefix(hidden)
  const allowPrefix = staticPatternPrefix(allow)
  return hidden.includes('**') && Boolean(hiddenPrefix) && (allowPrefix === hiddenPrefix || allowPrefix.startsWith(`${hiddenPrefix}/`))
}

function patternsOverlap(hiddenPattern: string, allowPattern: string) {
  if (patternCovers(hiddenPattern, allowPattern) || patternCovers(allowPattern, hiddenPattern)) return true
  const hiddenPrefix = staticPatternPrefix(hiddenPattern)
  const allowPrefix = staticPatternPrefix(allowPattern)
  if (hiddenPrefix && allowPrefix && (hiddenPrefix === allowPrefix || hiddenPrefix.startsWith(`${allowPrefix}/`) || allowPrefix.startsWith(`${hiddenPrefix}/`))) return true

  try {
    return globToRegExp(hiddenPattern).test(globSample(allowPattern)) || globToRegExp(allowPattern).test(globSample(hiddenPattern))
  } catch {
    return false
  }
}

function normalizePattern(pattern: string) {
  return pattern.trim().replaceAll('\\', '/').replace(/^\/+/, '')
}

function staticPatternPrefix(pattern: string) {
  const normalized = normalizePattern(pattern).replace(/^\*\*\//, '')
  const wildcardIndex = normalized.search(/[?*[{(!]/)
  return (wildcardIndex === -1 ? normalized : normalized.slice(0, wildcardIndex)).replace(/\/+$/, '')
}

function globSample(pattern: string) {
  return normalizePattern(pattern).replace(/^\*\*\//, '').split('/').map((segment) => {
    if (segment === '**' || segment === '*') return 'sample'
    return segment.replaceAll('**', 'sample').replaceAll('*', 'sample').replaceAll('?', 'x').replace(/[{}()[\]!]/g, '') || 'sample'
  }).join('/')
}

function globToRegExp(pattern: string) {
  const normalized = normalizePattern(pattern)
  let source = ''
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index]
    if (character === '*' && normalized[index + 1] === '*') { source += '.*'; index += 1; continue }
    if (character === '*') { source += '[^/]*'; continue }
    if (character === '?') { source += '[^/]'; continue }
    source += '\\.+^$()|{}[]'.includes(character) ? `\\${character}` : character
  }
  return new RegExp(`^${source}$`)
}

function hasBalancedGlobDelimiters(pattern: string) {
  const stack: string[] = []
  const pairs: Record<string, string> = { ']': '[', ')': '(', '}': '{' }
  let escaped = false
  for (const character of pattern) {
    if (escaped) { escaped = false; continue }
    if (character === '\\') { escaped = true; continue }
    if (character === '[' || character === '(' || character === '{') { stack.push(character); continue }
    if (character === ']' || character === ')' || character === '}') {
      if (stack.pop() !== pairs[character]) return false
    }
  }
  return !escaped && stack.length === 0
}

function expiryLabel(value: string) {
  return value === 'never' ? 'Never expires' : `${value} days`
}

function expiryToIso(value: string) {
  if (value === 'never') return null
  const date = new Date()
  date.setDate(date.getDate() + Number(value))
  return date.toISOString()
}
