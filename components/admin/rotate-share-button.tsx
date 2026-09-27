'use client'

import { Check, Copy, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'

import { rotateShare } from '@/app/(admin)/dashboard/shares/[id]/actions'
import { Alert, AlertDescription, AlertTitle, Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input } from '@/components/ui'

export function RotateShareButton({ shareId, compact = false, revoked = false }: { shareId: string; compact?: boolean; revoked?: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const urlInputRef = useRef<HTMLInputElement | null>(null)

  function confirmRotate() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await rotateShare(shareId)
        setShareUrl(result.shareUrl)
        setCopied(false)
        setCopyError(null)
        router.refresh()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'The share could not be rotated.')
      }
    })
  }

  async function copyUrl() {
    if (!shareUrl) return
    setCopyError(null)
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError('Copy failed. Select the URL above and copy it manually.')
      urlInputRef.current?.focus()
      urlInputRef.current?.select()
    }
  }

  return (
    <Dialog>
      <DialogTrigger variant={compact ? 'text' : 'primary'} size={compact ? 'small' : undefined} className={compact ? 'w-full justify-start gap-2 px-2 text-xs' : 'gap-2'}>
        <RefreshCw className="size-4" aria-hidden="true" />
        {revoked ? 'Issue replacement link' : 'Rotate link'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{revoked ? 'Issue a replacement link?' : 'Rotate this share link?'}</DialogTitle>
          <DialogDescription>{revoked ? 'This reactivates the share and issues a new URL. The secret will be shown once below and cannot be recovered after leaving this dialog.' : 'Rotation invalidates the previous URL. The new secret will be shown once below and cannot be recovered after leaving this dialog.'}</DialogDescription>
        </DialogHeader>
        {error ? <Alert className="mt-4 border-destructive/40"><AlertTitle>Could not rotate share</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {shareUrl ? (
          <div className="mt-5 space-y-4 rounded-lg border border-success/40 bg-success/5 p-4">
            <div><p className="text-sm font-medium">Save this new link now</p><p className="mt-1 text-sm text-foreground-muted">The previous link no longer works. This new URL is shown only once.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row"><Input ref={urlInputRef} readOnly value={shareUrl} aria-label="Rotated share URL" className="bg-background font-mono text-xs" onFocus={(event) => event.currentTarget.select()} /><Button type="button" variant="primary" onClick={copyUrl} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>{copied ? 'Copied' : 'Copy link'}</Button></div>
            <p aria-live="polite" className={`min-h-5 text-xs ${copyError ? 'text-destructive' : 'text-success'}`}>{copyError || (copied ? 'Copied to your clipboard.' : 'Copy the new link before closing this dialog.')}</p>
          </div>
        ) : (
          <Alert className="mt-5"><AlertTitle>{revoked ? 'New secret required' : 'Old URL invalidation'}</AlertTitle><AlertDescription>{revoked ? 'The revoked share will only be usable again through the new URL issued below.' : 'Anyone using the previous URL will lose access as soon as rotation completes.'}</AlertDescription></Alert>
        )}
        <DialogFooter>
          <DialogClose>{shareUrl ? 'Done' : 'Cancel'}</DialogClose>
          {!shareUrl ? <Button type="button" variant="primary" loading={isPending} onClick={confirmRotate}>Rotate now</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
