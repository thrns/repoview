'use client'

import { Check, Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

import { rotateShare } from '@/app/(admin)/dashboard/shares/[id]/actions'
import { Alert, AlertDescription, AlertTitle, Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogSection, DialogSectionSeparator, DialogTitle, DialogTrigger, Input, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui'

export function RotateShareButton({ shareId, compact = false, revoked = false, iconOnly = false }: { shareId: string; compact?: boolean; revoked?: boolean; iconOnly?: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyFeedbackActive, setCopyFeedbackActive] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const urlInputRef = useRef<HTMLInputElement | null>(null)
  const copyResetTimeoutRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (copyResetTimeoutRef.current !== null) window.clearTimeout(copyResetTimeoutRef.current)
  }, [])

  function resetCopyFeedback() {
    if (copyResetTimeoutRef.current !== null) window.clearTimeout(copyResetTimeoutRef.current)
    copyResetTimeoutRef.current = null
    setCopyFeedbackActive(false)
  }

  function resetDialogState() {
    setError(null)
    setShareUrl(null)
    setCopied(false)
    resetCopyFeedback()
    setCopyError(null)
  }

  function confirmRotate() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await rotateShare(shareId)
        setShareUrl(result.shareUrl)
        setCopied(false)
        setCopyFeedbackActive(false)
        setCopyError(null)
        await copyUrl(result.shareUrl)
        router.refresh()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Could not generate a new share link.')
      }
    })
  }

  async function copyUrl(url = shareUrl) {
    if (!url) return
    setCopyError(null)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      if (iconOnly) {
        setCopyFeedbackActive(true)
        if (copyResetTimeoutRef.current !== null) window.clearTimeout(copyResetTimeoutRef.current)
        copyResetTimeoutRef.current = window.setTimeout(() => setCopyFeedbackActive(false), 1800)
      }
    } catch {
      setCopied(false)
      setCopyFeedbackActive(false)
      setCopyError('New link generated, but it could not be copied. Use the Copy button or select the URL above and copy it manually.')
      urlInputRef.current?.focus()
      urlInputRef.current?.select()
    }
  }

  const actionLabel = revoked ? 'Generate replacement link' : 'Generate & copy'
  const trigger = (
    <DialogTrigger
      variant={iconOnly ? 'text' : compact ? 'text' : 'primary'}
      size={iconOnly ? 'icon' : compact ? 'small' : undefined}
      aria-label={iconOnly ? (copyFeedbackActive ? 'New link copied' : revoked ? 'Generate replacement share link' : 'Generate new share link') : undefined}
      icon={iconOnly ? (copyFeedbackActive ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />) : <Copy className="size-4" aria-hidden="true" />}
      onClick={resetDialogState}
      className={iconOnly ? '!size-8 !p-0 text-foreground-muted hover:bg-surface-200 hover:text-foreground' : compact ? 'w-full justify-start gap-2 px-2 text-xs' : 'gap-2'}
    >
      {iconOnly ? <span className="sr-only">{actionLabel}</span> : actionLabel}
    </DialogTrigger>
  )

  return (
    <Dialog>
      {iconOnly ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>{trigger}</TooltipTrigger>
            <TooltipContent>{copyFeedbackActive ? 'New link copied' : revoked ? 'Generate replacement link' : 'Generate new link'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : trigger}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{revoked ? 'Issue a replacement link?' : 'Generate a new share link?'}</DialogTitle>
          <DialogDescription>{revoked ? 'The previous link has been revoked. This issues a fresh nine-character capability code and reactivates the share; the URL will be shown once below.' : 'Generating a fresh nine-character capability code will invalidate the previous link immediately.'}</DialogDescription>
        </DialogHeader>
        <DialogSectionSeparator />
        {error ? <Alert className="mt-4 border-destructive/40"><AlertTitle>Could not generate a new share link</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {shareUrl ? (
          <div className="mt-4 min-w-0 space-y-4 rounded-md border border-success/40 bg-success/5 p-4">
            <div><p className="text-sm font-medium">New share link</p><p className="mt-1 text-sm text-foreground-muted">Save or copy this link now. The public code is stored for share lookup, while its HMAC is used for server-side validation.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row"><Input ref={urlInputRef} readOnly value={shareUrl} aria-label="New share URL" className="bg-background font-mono text-xs" onFocus={(event) => event.currentTarget.select()} /><Button type="button" variant="primary" onClick={() => { void copyUrl() }} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>{copied ? 'Copied' : 'Copy link'}</Button></div>
            <p aria-live="polite" className={`min-h-5 text-xs ${copyError ? 'text-destructive' : 'text-success'}`}>{copyError || (copied ? 'New link copied' : 'Copy the new link before closing this dialog.')}</p>
          </div>
        ) : (
          <DialogSection className="space-y-1.5">
            <p className="text-sm font-medium">{revoked ? 'New capability required' : 'Old URL invalidation'}</p>
            <p className="text-sm text-foreground-muted">{revoked ? 'The revoked share will only be usable again through the new URL issued below.' : 'Anyone using the previous URL will lose access as soon as rotation completes.'}</p>
          </DialogSection>
        )}
        <DialogFooter>
          <DialogClose>{shareUrl ? 'Done' : 'Cancel'}</DialogClose>
          {!shareUrl ? <Button type="button" variant="primary" loading={isPending} onClick={confirmRotate}>{iconOnly ? 'Generate & copy' : actionLabel}</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
