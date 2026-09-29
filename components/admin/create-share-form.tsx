'use client'

import { cloneElement, isValidElement, useEffect, useId, useRef, useState, useTransition, type FormEvent, type ReactElement, type ReactNode } from 'react'
import { ArrowLeft, Check, ChevronDown, CircleCheck, Copy, LockKeyhole, TriangleAlert } from 'lucide-react'
import Link from 'next/link'

import { createShare } from '@/app/(admin)/dashboard/shares/new/actions'
import { Alert, AlertDescription, AlertTitle, Button, Input, Label, Select, Switch, Textarea } from '@/components/ui'

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
  const [createdShare, setCreatedShare] = useState<CreatedShare | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedRepository = repositories.find((repository) => repository.id === repositoryId)
  const visibilityFeedback = getVisibilityFeedback(hidden, allowOnly)

  function changeRepository(nextRepositoryId: string) {
    const nextRepository = repositories.find((repository) => repository.id === nextRepositoryId)
    setRepositoryId(nextRepositoryId)
    setRef(nextRepository?.defaultBranch ?? '')
    setError(null)
  }

  function changeShareType(nextShareType: 'generic' | 'recipient') {
    setShareType(nextShareType)
    if (nextShareType === 'generic') {
      setRecipientName('')
      setCompany('')
      setEmail('')
      setRoleNotes('')
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

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
        setCreatedShare({
          url: result.shareUrl,
          repository: result.repository,
          ref: result.ref,
          recipient: shareType === 'generic' ? 'Generic share' : recipientName || recipientLabel || company || 'Recipient share',
          expiry: expiryLabel(expiry),
        })
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Share details could not be validated.')
      }
    })
  }

  function resetForAnotherShare() {
    setCreatedShare(null)
    setError(null)
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

  if (createdShare) {
    return <OneTimeShareResult share={createdShare} onboarding={onboarding} onCreateAnother={resetForAnotherShare} />
  }

  return (
    <form className="space-y-9 pb-6" onSubmit={submit}>
      {error ? <Alert className="border-destructive/40" role="alert"><AlertTitle>Check these details</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

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

      <FormSection title="Recipient or share identity" description="Choose whether this link is meant for a named recipient or is a generic anonymous share.">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.45fr)_minmax(0,0.9fr)]">
          <Field label="Share type" htmlFor="share-type" help={shareType === 'recipient' ? 'A recipient share is labelled for your records; it does not verify who opens the link.' : 'A generic share has no recipient identity attached.'}>
            <Select id="share-type" value={shareType} onChange={(event) => changeShareType(event.target.value as 'generic' | 'recipient')}>
              <option value="recipient">Recipient share</option>
              <option value="generic">Generic share</option>
            </Select>
          </Field>
          {shareType === 'recipient' ? <Field label={<><span>Recipient name</span> <span className="font-normal text-foreground-muted">(optional)</span></>} htmlFor="share-recipient-name" help="Saved as recipient metadata and used as the main label in your owner workspace.">
            <Input id="share-recipient-name" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Jane Smith" aria-describedby="share-recipient-name-help" />
          </Field> : <Field label={<><span>Share label</span> <span className="font-normal text-foreground-muted">(optional)</span></>} htmlFor="share-generic-label" help="A private owner-facing label for finding this generic share later.">
            <Input id="share-generic-label" value={recipientLabel} onChange={(event) => setRecipientLabel(event.target.value)} placeholder="Public demo link" aria-describedby="share-generic-label-help" />
          </Field>}
        </div>

        <details className="group mt-5 border-t border-border/70 pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span>{shareType === 'recipient' ? 'Add recipient details' : 'Add a note'} <span className="font-normal text-foreground-muted">(optional)</span></span>
            <ChevronDown className="size-4 text-foreground-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {shareType === 'recipient' ? <>
              <Field label="Company" htmlFor="share-company" help="Optional organization context for your records.">
                <Input id="share-company" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Stripe" />
              </Field>
              <Field label="Email" htmlFor="share-email" help="Optional contact detail; RepoView does not verify it or send the share automatically.">
                <Input id="share-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jane@stripe.com" />
              </Field>
              <Field label="Internal share label" htmlFor="share-label" help="Optional fallback label for your owner workspace when no recipient name is provided. It is not a verified identity.">
                <Input id="share-label" value={recipientLabel} onChange={(event) => setRecipientLabel(event.target.value)} placeholder="Staff engineer interview" aria-describedby="share-label-help" />
              </Field>
              <Field label="Role or application context" htmlFor="share-role-notes" help="Optional context such as a team, role, or application stage.">
                <Input id="share-role-notes" value={roleNotes} onChange={(event) => setRoleNotes(event.target.value)} placeholder="Platform team" />
              </Field>
            </> : null}
            <Field className="sm:col-span-2" label={<><span>General note</span> <span className="font-normal text-foreground-muted">(optional)</span></>} htmlFor="share-note" help="A private owner note about why this share exists.">
              <Textarea id="share-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Context for this share" rows={3} />
            </Field>
          </div>
        </details>
      </FormSection>

      <FormSection title="Access" description="Set when access ends, then choose the optional download and notification preferences.">
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

      <section className="rounded-md border border-border bg-surface-100 p-5 sm:p-6">
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
          {visibilityFeedback.warning ? <div className="mt-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2.5 text-xs leading-5 text-warning" role="status"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span>{visibilityFeedback.warning}</span></div> : null}
          {visibilityFeedback.error ? <p className="mt-4 text-xs leading-5 text-destructive" role="alert">{visibilityFeedback.error}</p> : null}
        </details>
      </section>

      <div className="rounded-md border border-border bg-surface-200 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-xs leading-5">
            <p className="font-medium text-foreground">Ready to create</p>
            <p className="truncate text-foreground-muted" title={`${selectedRepository?.fullName ?? 'No repository'} · ${ref || 'No ref'} · ${expiryLabel(expiry)} · ${allowDownload ? 'Downloads allowed' : 'Downloads off'}`}>
              {selectedRepository?.fullName ?? 'No repository'} <span className="px-1 text-foreground-muted/60">·</span> {ref || 'No ref'} <span className="px-1 text-foreground-muted/60">·</span> {expiryLabel(expiry)} <span className="px-1 text-foreground-muted/60">·</span> {allowDownload ? 'Downloads allowed' : 'Downloads off'}
            </p>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
            <Link href="/dashboard/shares" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium text-foreground-muted transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-3.5" aria-hidden="true" /> Back</Link>
            <Button type="submit" variant="primary" loading={isPending}>Create share</Button>
          </div>
        </div>
      </div>
    </form>
  )
}

function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="rounded-md border border-border bg-surface-100 p-5 sm:p-6"><div className="mb-4"><h2 className="font-heading text-sm font-semibold tracking-tight">{title}</h2><p className="mt-1 text-xs leading-5 text-foreground-muted">{description}</p></div>{children}</section>
}

function Field({ label, htmlFor, help, className, children }: { label: ReactNode; htmlFor: string; help?: string; className?: string; children: ReactNode }) {
  const helpId = `${htmlFor}-help`
  const describedChildren = help && isValidElement(children)
    ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, { 'aria-describedby': helpId })
    : children
  return <div className={`space-y-1.5 ${className ?? ''}`}><Label htmlFor={htmlFor}>{label}</Label>{describedChildren}{help ? <p id={helpId} className="text-xs leading-5 text-foreground-muted">{help}</p> : null}</div>
}

function ToggleRow({ checked, onChange, title, description }: { checked: boolean; onChange: (checked: boolean) => void; title: string; description: string }) {
  const id = useId()
  const descriptionId = `${id}-description`
  return <label htmlFor={id} className="flex min-h-[68px] w-full cursor-pointer items-center justify-between gap-5 rounded-md px-2 text-left transition-colors hover:bg-accent/25 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-inset">
    <span className="min-w-0"><span className="block text-sm font-medium">{title}</span><span id={descriptionId} className="mt-0.5 block text-xs leading-5 text-foreground-muted">{description}</span></span>
    <Switch id={id} checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={title} aria-describedby={descriptionId} />
  </label>
}

type CreatedShare = { url: string; repository: string; ref: string; recipient: string; expiry: string }

function OneTimeShareResult({ share, onboarding, onCreateAnother }: { share: CreatedShare; onboarding: boolean; onCreateAnother: () => void }) {
  const resultRef = useRef<HTMLElement | null>(null)
  const urlInputRef = useRef<HTMLInputElement | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => resultRef.current?.focus())
    return () => window.cancelAnimationFrame(focusFrame)
  }, [])

  async function copyUrl() {
    setCopyError(null)
    try {
      await navigator.clipboard.writeText(share.url)
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError('Copy failed. Select the URL above and copy it manually.')
      urlInputRef.current?.focus()
      urlInputRef.current?.select()
    }
  }

  return (
    <section ref={resultRef} tabIndex={-1} aria-labelledby="share-created-title" className="space-y-6 outline-none">
      <div className="flex items-start gap-3">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <h2 id="share-created-title" className="font-heading text-2xl font-semibold tracking-tight">Share created</h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">Save this exact URL now. RepoView stores only its hash, so the plaintext link will not be recoverable after you leave this page.</p>
        </div>
      </div>
      <div className="space-y-3 rounded-lg border border-success/35 bg-success/5 px-4 py-5 sm:px-5">
        <div className="flex items-center gap-2 text-xs font-medium text-success"><LockKeyhole className="size-3.5" aria-hidden="true" />One-time secret URL</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input ref={urlInputRef} readOnly value={share.url} aria-label="New share URL" className="min-w-0 bg-background font-mono text-xs" onFocus={(event) => event.currentTarget.select()} />
          <Button type="button" variant="primary" onClick={copyUrl} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>{copied ? 'Copied' : 'Copy link'}</Button>
        </div>
        <p aria-live="polite" className="min-h-5 text-xs text-success">{copied ? 'Copied to your clipboard.' : copyError ? <span role="alert" className="text-destructive">{copyError}</span> : 'Copy the link before navigating away.'}</p>
      </div>
      <dl className="grid gap-3 rounded-lg border border-border/60 bg-muted/18 p-4 sm:grid-cols-2">
        <ResultField label="Repository" value={share.repository} mono />
        <ResultField label="Ref" value={share.ref} mono />
        <ResultField label={onboarding ? 'Share identity' : 'Recipient'} value={share.recipient} />
        <ResultField label="Expiry" value={share.expiry} />
      </dl>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={onboarding ? '/dashboard' : '/dashboard/shares'} className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{onboarding ? 'Continue to dashboard' : 'View shares'}</Link>
        <Button type="button" variant="text" onClick={onCreateAnother}>Create another share</Button>
      </div>
    </section>
  )
}

function ResultField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><dt className="text-xs text-foreground-muted">{label}</dt><dd className={`mt-1 truncate text-sm text-foreground ${mono ? 'font-mono text-xs' : ''}`} title={value}>{value}</dd></div>
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
