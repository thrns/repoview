'use client'

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { ArrowLeft, Check, ChevronDown, Copy, LockKeyhole, TriangleAlert } from 'lucide-react'
import Link from 'next/link'

import { createShare } from '@/app/(admin)/dashboard/shares/new/actions'
import {
  Admonition,
  Button,
  Card,
  CardContent,
  CardFooter,
  FormItemLayout,
  Input,
  Label,
  PageSection,
  PageSectionContent,
  PageSectionDescription,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
  Select,
  Switch,
  Textarea,
} from '@/components/ui'

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
  const [shareType, setShareType] = useState<'generic' | 'recipient'>('generic')
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
          code: result.shareCode,
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
    setShareType('generic')
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
    return <Admonition type="warning" title="No enabled repositories" description="Enable a repository before creating a share. Return to the repositories dashboard to choose one." />
  }

  if (createdShare) {
    return <OneTimeShareResult share={createdShare} onboarding={onboarding} onCreateAnother={resetForAnotherShare} />
  }

  return (
    <form className="space-y-0 pb-8" onSubmit={submit}>
      {error ? <Admonition type="destructive" title="Check these details" description={error} className="mb-6" /> : null}

      <PageSection className="gap-3 pb-0 pt-0">
        <PageSectionMeta>
          <PageSectionSummary>
            <PageSectionTitle>Repository</PageSectionTitle>
            <PageSectionDescription>Choose the source and exact ref this link should expose.</PageSectionDescription>
          </PageSectionSummary>
        </PageSectionMeta>
        <PageSectionContent>
          <Card>
            <CardContent className="pt-5">
              <FormItemLayout
                layout="flex-row"
                label={<Label htmlFor="share-repository">Repository</Label>}
                description={<span id="share-repository-description">The private GitHub repository exposed by this share.</span>}
              >
                <div className="w-full max-w-sm">
                  <Select id="share-repository" value={repositoryId} aria-describedby="share-repository-description" onChange={(event) => changeRepository(event.target.value)}>
                    {repositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.fullName}</option>)}
                  </Select>
                </div>
              </FormItemLayout>
            </CardContent>
            <CardContent>
              <FormItemLayout
                layout="flex-row"
                label={<Label htmlFor="share-ref">Branch or ref</Label>}
                description={<span id="share-ref-description">Choose the branch/ref used by this share.</span>}
              >
                <div className="w-full max-w-sm">
                  <Select id="share-ref" value={ref} aria-describedby="share-ref-description" onChange={(event) => setRef(event.target.value)}>
                    {(selectedRepository?.branches ?? []).map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                  </Select>
                </div>
              </FormItemLayout>
            </CardContent>
          </Card>
        </PageSectionContent>
      </PageSection>

      <PageSection className="gap-3 pb-0 pt-6">
        <PageSectionMeta>
          <PageSectionSummary>
            <PageSectionTitle>Recipient or share identity</PageSectionTitle>
            <PageSectionDescription>Choose whether this link is meant for a named recipient or is a generic anonymous share.</PageSectionDescription>
          </PageSectionSummary>
        </PageSectionMeta>
        <PageSectionContent>
          <Card>
            <CardContent className="pt-5">
              <FormItemLayout
                layout="flex-row"
                label={<Label htmlFor="share-type">Share type</Label>}
                description={<span id="share-type-description">{shareType === 'recipient' ? 'A recipient share is labelled for your records; it does not verify who opens the link.' : 'A generic share has no recipient identity attached.'}</span>}
              >
                <div className="w-full max-w-sm">
                  <Select id="share-type" value={shareType} aria-describedby="share-type-description" onChange={(event) => changeShareType(event.target.value as 'generic' | 'recipient')}>
                    <option value="generic">Generic share</option>
                    <option value="recipient">Recipient share</option>
                  </Select>
                </div>
              </FormItemLayout>
            </CardContent>
            <CardContent>
              {shareType === 'recipient' ? (
                <FormItemLayout
                  layout="flex-row"
                  label={<Label htmlFor="share-recipient-name"><span>Recipient name</span> <span className="font-normal text-foreground-muted">(optional)</span></Label>}
                  description={<span id="share-recipient-name-description">Saved as recipient metadata and used as the main label in your owner workspace.</span>}
                >
                  <div className="w-full max-w-sm">
                    <Input id="share-recipient-name" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Jane Smith" aria-describedby="share-recipient-name-description" />
                  </div>
                </FormItemLayout>
              ) : (
                <FormItemLayout
                  layout="flex-row"
                  label={<Label htmlFor="share-generic-label"><span>Share label</span> <span className="font-normal text-foreground-muted">(optional)</span></Label>}
                  description={<span id="share-generic-label-description">Private owner-facing label for finding this share later.</span>}
                >
                  <div className="w-full max-w-sm">
                    <Input id="share-generic-label" value={recipientLabel} onChange={(event) => setRecipientLabel(event.target.value)} placeholder="Public demo link" aria-describedby="share-generic-label-description" />
                  </div>
                </FormItemLayout>
              )}
            </CardContent>
            <CardContent className="py-3.5">
              <details className="group">
                <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <span>{shareType === 'recipient' ? 'Add recipient details' : 'Add a note'} <span className="font-normal text-foreground-muted">(optional)</span></span>
                  <ChevronDown className="size-4 shrink-0 text-foreground-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="mt-4 space-y-4 border-t border-border-secondary pt-4">
                  {shareType === 'recipient' ? <>
                    <FormItemLayout
                      layout="flex-row"
                      label={<Label htmlFor="share-company">Company</Label>}
                      description={<span id="share-company-description">Optional organization context for your records.</span>}
                    >
                      <div className="w-full max-w-sm">
                        <Input id="share-company" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Stripe" aria-describedby="share-company-description" />
                      </div>
                    </FormItemLayout>
                    <FormItemLayout
                      layout="flex-row"
                      label={<Label htmlFor="share-email">Email</Label>}
                      description={<span id="share-email-description">Optional contact detail; RepoView does not verify it or send the share automatically.</span>}
                    >
                      <div className="w-full max-w-sm">
                        <Input id="share-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jane@stripe.com" aria-describedby="share-email-description" />
                      </div>
                    </FormItemLayout>
                    <FormItemLayout
                      layout="flex-row"
                      label={<Label htmlFor="share-label">Internal share label</Label>}
                      description={<span id="share-label-description">Optional fallback label for your owner workspace when no recipient name is provided. It is not a verified identity.</span>}
                    >
                      <div className="w-full max-w-sm">
                        <Input id="share-label" value={recipientLabel} onChange={(event) => setRecipientLabel(event.target.value)} placeholder="Staff engineer interview" aria-describedby="share-label-description" />
                      </div>
                    </FormItemLayout>
                    <FormItemLayout
                      layout="flex-row"
                      label={<Label htmlFor="share-role-notes">Role or application context</Label>}
                      description={<span id="share-role-notes-description">Optional context such as a team, role, or application stage.</span>}
                    >
                      <div className="w-full max-w-sm">
                        <Input id="share-role-notes" value={roleNotes} onChange={(event) => setRoleNotes(event.target.value)} placeholder="Platform team" aria-describedby="share-role-notes-description" />
                      </div>
                    </FormItemLayout>
                  </> : null}
                  <FormItemLayout
                    layout="flex-row"
                    label={<Label htmlFor="share-note"><span>General note</span> <span className="font-normal text-foreground-muted">(optional)</span></Label>}
                    description={<span id="share-note-description">A private owner note about why this share exists.</span>}
                  >
                    <div className="w-full max-w-sm">
                      <Textarea id="share-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Context for this share" rows={3} aria-describedby="share-note-description" />
                    </div>
                  </FormItemLayout>
                </div>
              </details>
            </CardContent>
          </Card>
        </PageSectionContent>
      </PageSection>

      <PageSection className="gap-3 pb-0 pt-6">
        <PageSectionMeta>
          <PageSectionSummary>
            <PageSectionTitle>Access</PageSectionTitle>
            <PageSectionDescription>Set when access to this share ends, then choose the optional download and notification preferences.</PageSectionDescription>
          </PageSectionSummary>
        </PageSectionMeta>
        <PageSectionContent>
          <Card>
            <CardContent className="pt-5">
              <FormItemLayout
                layout="flex-row"
                label={<Label htmlFor="share-expiry">Expiry</Label>}
                description={<span id="share-expiry-description">Set when access to this share ends.</span>}
              >
                <div className="w-full max-w-sm">
                  <Select id="share-expiry" value={expiry} aria-describedby="share-expiry-description" onChange={(event) => setExpiry(event.target.value)}>
                    <option value="never">Never</option>
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                  </Select>
                </div>
              </FormItemLayout>
            </CardContent>
            <CardContent>
              <FormItemLayout
                layout="flex-row"
                label={<Label htmlFor="share-notify-on-view">Notify on every meaningful view</Label>}
                description={<span id="share-notify-on-view-description">Send one owner notification for each real browser session that is confirmed.</span>}
              >
                <Switch id="share-notify-on-view" checked={notifyOnView} onChange={(event) => setNotifyOnView(event.target.checked)} aria-describedby="share-notify-on-view-description" />
              </FormItemLayout>
            </CardContent>
            <CardContent>
              <FormItemLayout
                layout="flex-row"
                label={<Label htmlFor="share-allow-download">Allow downloads</Label>}
                description={<span id="share-allow-download-description">Allow the viewer to download files exposed by this share.</span>}
              >
                <Switch id="share-allow-download" checked={allowDownload} onChange={(event) => setAllowDownload(event.target.checked)} aria-describedby="share-allow-download-description" />
              </FormItemLayout>
            </CardContent>
          </Card>
        </PageSectionContent>
      </PageSection>

      <PageSection className="gap-3 pb-0 pt-6">
        <PageSectionMeta>
          <PageSectionSummary>
            <PageSectionTitle>Advanced visibility rules</PageSectionTitle>
            <PageSectionDescription>Further narrow which paths can appear in this share.</PageSectionDescription>
          </PageSectionSummary>
        </PageSectionMeta>
        <PageSectionContent>
          <Card>
            <CardContent className="py-3.5">
              <details className="group">
                <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <span>Configure path rules <span className="font-normal text-foreground-muted">(optional)</span></span>
                  <ChevronDown className="size-4 shrink-0 text-foreground-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="mt-4 space-y-4 border-t border-border-secondary pt-4">
                  <FormItemLayout
                    layout="flex-row"
                    label={<Label htmlFor="share-hidden">Hidden paths</Label>}
                    description={<span id="share-hidden-description">Paths that must never be fetched for a viewer. Example: **/private/**</span>}
                  >
                    <div className="w-full max-w-sm">
                      <Textarea id="share-hidden" value={hidden} onChange={(event) => setHidden(event.target.value)} placeholder="**/private/**" rows={4} aria-describedby="share-hidden-description" />
                    </div>
                  </FormItemLayout>
                  <FormItemLayout
                    layout="flex-row"
                    label={<Label htmlFor="share-allow-only">Only allow paths</Label>}
                    description={<span id="share-allow-only-description">When configured, paths must match at least one allowed pattern. Example: src/** or docs/**</span>}
                  >
                    <div className="w-full max-w-sm">
                      <Textarea id="share-allow-only" value={allowOnly} onChange={(event) => setAllowOnly(event.target.value)} placeholder="src/**\ndocs/**" rows={4} aria-describedby="share-allow-only-description" />
                    </div>
                  </FormItemLayout>
                  {visibilityFeedback.warning ? <Admonition type="warning" icon={<TriangleAlert className="size-3.5" />} description={visibilityFeedback.warning} className="p-3 text-xs" /> : null}
                  {visibilityFeedback.error ? <Admonition type="destructive" title="Visibility rules need attention" description={visibilityFeedback.error} className="p-3 text-xs" /> : null}
                </div>
              </details>
            </CardContent>
          </Card>
        </PageSectionContent>
      </PageSection>

      <Card className="mt-6">
        <CardFooter className="flex-wrap justify-between gap-3 py-3.5">
          <p className="min-w-0 flex-1 truncate type-meta" title={`${selectedRepository?.fullName ?? 'No repository'} · ${ref || 'No ref'} · ${expiryLabel(expiry)} · ${allowDownload ? 'Downloads allowed' : 'Downloads off'}`}>
            {selectedRepository?.fullName ?? 'No repository'} <span className="px-1 text-foreground-muted/60">·</span> {ref || 'No ref'} <span className="px-1 text-foreground-muted/60">·</span> {expiryLabel(expiry)} <span className="px-1 text-foreground-muted/60">·</span> {allowDownload ? 'Downloads allowed' : 'Downloads off'}
          </p>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button asChild variant="text">
              <Link href="/dashboard/shares"><ArrowLeft className="size-3.5" aria-hidden="true" /> Back</Link>
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>Create share</Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}

type CreatedShare = { code: string; url: string; repository: string; ref: string; recipient: string; expiry: string }

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
    <section ref={resultRef} tabIndex={-1} aria-labelledby="share-created-title" className="outline-none">
      <PageSection className="gap-3 pb-0 pt-0">
        <PageSectionMeta>
          <PageSectionSummary>
            <PageSectionTitle id="share-created-title">Share created</PageSectionTitle>
            <PageSectionDescription>Save this exact URL now. Its nine-character code is the public capability used to open this share.</PageSectionDescription>
          </PageSectionSummary>
        </PageSectionMeta>
        <PageSectionContent>
          <Card>
            <CardContent className="pt-5">
              <Admonition
                type="success"
                icon={<LockKeyhole className="size-4" />}
                title="Save this exact URL now."
                description="The generated link is the one-time public capability used to open this share."
              />
            </CardContent>
            <CardContent>
              <FormItemLayout
                layout="flex-row"
                label={<Label htmlFor="created-share-url">Scoped share URL</Label>}
                description={<span id="created-share-url-description">Copy the link before navigating away.</span>}
              >
                <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
                  <Input
                    ref={urlInputRef}
                    id="created-share-url"
                    readOnly
                    value={share.url}
                    aria-describedby="created-share-url-description created-share-url-status"
                    className="min-w-0 bg-background font-mono text-xs"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <Button type="button" variant="primary" onClick={copyUrl} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>
                    {copied ? 'Copied' : 'Copy link'}
                  </Button>
                </div>
                <p id="created-share-url-status" aria-live="polite" className="min-h-5 text-xs text-success">
                  {copied ? 'Copied to your clipboard.' : copyError ? <span role="alert" className="text-destructive">{copyError}</span> : 'Copy the link before navigating away.'}
                </p>
              </FormItemLayout>
            </CardContent>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <ResultField label="Share code" value={share.code} mono />
                <ResultField label="Repository" value={share.repository} mono />
                <ResultField label="Ref" value={share.ref} mono />
                <ResultField label={onboarding ? 'Share identity' : 'Recipient'} value={share.recipient} />
                <ResultField label="Expiry" value={share.expiry} />
              </dl>
            </CardContent>
            <CardFooter className="flex-wrap justify-end gap-2 py-3.5">
              <Button asChild variant="outline">
                <Link href={onboarding ? '/dashboard' : '/dashboard/shares'}>{onboarding ? 'Continue to dashboard' : 'View shares'}</Link>
              </Button>
              <Button type="button" variant="text" onClick={onCreateAnother}>Create another share</Button>
            </CardFooter>
          </Card>
        </PageSectionContent>
      </PageSection>
    </section>
  )
}

function ResultField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><dt className="type-meta">{label}</dt><dd className={`mt-1 truncate text-sm text-foreground ${mono ? 'type-code' : ''}`} title={value}>{value}</dd></div>
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
