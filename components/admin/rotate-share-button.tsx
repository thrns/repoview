'use client'

import { Check, Copy, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { rotateShare } from '@/app/(admin)/dashboard/shares/[id]/actions'
import { Alert, AlertDescription, AlertTitle, Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input } from '@/components/ui'

export function RotateShareButton({ shareId }: { shareId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function confirmRotate() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await rotateShare(shareId)
        setShareUrl(result.shareUrl)
        setCopied(false)
        router.refresh()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'The share could not be rotated.')
      }
    })
  }

  async function copyUrl() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
  }

  return (
    <Dialog>
      <DialogTrigger variant="outline" className="gap-2">
        <RefreshCw className="size-4" aria-hidden="true" />
        Rotate link
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rotate this share link?</DialogTitle>
          <DialogDescription>Rotation invalidates the previous URL. The new secret will be shown once below and cannot be recovered after leaving this dialog.</DialogDescription>
        </DialogHeader>
        {error ? <Alert className="mt-4 border-destructive/40"><AlertTitle>Could not rotate share</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {shareUrl ? (
          <div className="mt-5 space-y-4 rounded-lg border border-success/40 bg-success/5 p-4">
            <div><p className="text-sm font-medium">Save this new link now</p><p className="mt-1 text-sm text-foreground-muted">The previous link no longer works. This new URL is shown only once.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row"><Input readOnly value={shareUrl} aria-label="Rotated share URL" className="font-mono text-xs" /><Button type="button" variant="outline" onClick={copyUrl} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>{copied ? 'Copied' : 'Copy link'}</Button></div>
          </div>
        ) : (
          <Alert className="mt-5"><AlertTitle>Old URL invalidation</AlertTitle><AlertDescription>Anyone using the previous URL will lose access as soon as rotation completes.</AlertDescription></Alert>
        )}
        <DialogFooter>
          <DialogClose>{shareUrl ? 'Done' : 'Cancel'}</DialogClose>
          {!shareUrl ? <Button type="button" loading={isPending} onClick={confirmRotate}>Rotate now</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
