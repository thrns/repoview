'use client'

import { useState, useTransition } from 'react'

import { createShare } from '@/app/(admin)/dashboard/shares/new/actions'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
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
}

export function CreateShareForm({ repositories }: CreateShareFormProps) {
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

  function changeRepository(nextRepositoryId: string) {
    const nextRepository = repositories.find((repository) => repository.id === nextRepositoryId)
    setRepositoryId(nextRepositoryId)
    setRef(nextRepository?.defaultBranch ?? '')
    setError(null)
    setSuccess(null)
    setCopied(false)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

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

  if (repositories.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertTitle>No enabled repositories</AlertTitle>
            <AlertDescription>
              Enable a repository before creating a share. Return to the repositories dashboard to choose one.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share details</CardTitle>
        <CardDescription>Choose a repository and ref, then set the access and visibility rules for this recipient.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={submit}>
          {error ? <Alert className="border-destructive/40"><AlertTitle>Check these details</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          {success ? <Alert className="border-success/40"><AlertTitle>Share created</AlertTitle><AlertDescription>{success}</AlertDescription></Alert> : null}

          {createdShareUrl ? <OneTimeShareResult url={createdShareUrl} copied={copied} onCopied={() => setCopied(true)} onCreateAnother={() => {
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
          }} /> : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="share-repository">Repository</Label>
              <Select id="share-repository" value={repositoryId} onChange={(event) => changeRepository(event.target.value)}>
                {repositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.fullName}</option>)}
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="share-type">Share type</Label>
              <Select id="share-type" value={shareType} onChange={(event) => setShareType(event.target.value as 'generic' | 'recipient')}>
                <option value="recipient">Recipient-labelled link</option>
                <option value="generic">Generic anonymous link</option>
              </Select>
              <p className="text-xs text-foreground-muted">The label describes the intended recipient only. Viewer identity remains unverified.</p>
            </div>
            {shareType === 'recipient' ? <>
              <div className="space-y-2">
                <Label htmlFor="share-recipient-name">Recipient name <span className="font-normal text-foreground-muted">(optional)</span></Label>
                <Input id="share-recipient-name" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-company">Company <span className="font-normal text-foreground-muted">(optional)</span></Label>
                <Input id="share-company" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Stripe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-email">Email <span className="font-normal text-foreground-muted">(optional)</span></Label>
                <Input id="share-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jane@stripe.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-label">Internal label <span className="font-normal text-foreground-muted">(optional)</span></Label>
                <Input id="share-label" value={recipientLabel} onChange={(event) => setRecipientLabel(event.target.value)} placeholder="Staff engineer interview" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="share-role-notes">Role / application notes <span className="font-normal text-foreground-muted">(optional)</span></Label>
                <Textarea id="share-role-notes" value={roleNotes} onChange={(event) => setRoleNotes(event.target.value)} placeholder="Backend staff candidate · platform team" rows={3} />
              </div>
            </> : null}
            <div className="space-y-2">
              <Label htmlFor="share-ref">Branch or ref</Label>
              <Select id="share-ref" value={ref} onChange={(event) => setRef(event.target.value)}>
                {(selectedRepository?.branches ?? []).map((branch) => <option key={branch} value={branch}>{branch}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-expiry">Expiry</Label>
              <Select id="share-expiry" value={expiry} onChange={(event) => setExpiry(event.target.value)}>
                <option value="never">Never</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="share-note">Note <span className="font-normal text-foreground-muted">(optional)</span></Label>
              <Textarea id="share-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Context for this share" rows={3} />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium">Access settings</p>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={notifyOnView} onChange={(event) => setNotifyOnView(event.target.checked)} />
              <span><span className="font-medium">Notify on meaningful view</span><span className="mt-0.5 block text-xs text-foreground-muted">Send one owner notification after a real browser session is confirmed.</span></span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={allowDownload} onChange={(event) => setAllowDownload(event.target.checked)} />
              <span><span className="font-medium">Allow downloads</span><span className="mt-0.5 block text-xs text-foreground-muted">Keep disabled unless this recipient should be able to download files.</span></span>
            </label>
          </div>

          <details className="rounded-lg border border-border">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Advanced visibility rules</summary>
            <div className="grid gap-5 border-t border-border p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="share-hidden">Hidden patterns</Label>
                <Textarea id="share-hidden" value={hidden} onChange={(event) => setHidden(event.target.value)} placeholder="**/private/**" rows={5} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-allow-only">Allow-only patterns</Label>
                <Textarea id="share-allow-only" value={allowOnly} onChange={(event) => setAllowOnly(event.target.value)} placeholder="src/**\ndocs/**" rows={5} />
              </div>
            </div>
          </details>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={isPending}>{createdShareUrl ? 'Create another share' : 'Create secure share'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function OneTimeShareResult({
  url,
  copied,
  onCopied,
  onCreateAnother,
}: {
  url: string
  copied: boolean
  onCopied: () => void
  onCreateAnother: () => void
}) {
  async function copyUrl() {
    await navigator.clipboard.writeText(url)
    onCopied()
  }

  return (
    <div className="space-y-4 rounded-lg border border-success/40 bg-success/5 p-4">
      <div>
        <p className="text-sm font-medium">Save this link now</p>
        <p className="mt-1 text-sm text-foreground-muted">
          This exact URL cannot be recovered because RepoView stores only its hash. It will not be shown again after you leave this page.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={url} aria-label="New share URL" className="font-mono text-xs" />
        <Button type="button" variant="outline" onClick={copyUrl}>{copied ? 'Copied' : 'Copy link'}</Button>
      </div>
      <Button type="button" variant="text" onClick={onCreateAnother}>Create another share</Button>
    </div>
  )
}

function toPatterns(value: string) {
  return value.split('\n').map((pattern) => pattern.trim()).filter(Boolean)
}

function expiryToIso(value: string) {
  if (value === 'never') {
    return null
  }

  const date = new Date()
  date.setDate(date.getDate() + Number(value))
  return date.toISOString()
}
