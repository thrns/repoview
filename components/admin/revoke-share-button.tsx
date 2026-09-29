'use client'

import { AlertTriangle, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { revokeShare } from '@/app/(admin)/dashboard/shares/[id]/actions'
import { Alert, AlertDescription, AlertTitle, Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui'

export function RevokeShareButton({ shareId, disabled = false, compact = false, iconOnly = false }: { shareId: string; disabled?: boolean; compact?: boolean; iconOnly?: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  function confirmRevoke() {
    setError(null)
    startTransition(async () => {
      try {
        await revokeShare(shareId)
        setCompleted(true)
        router.refresh()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'The share could not be revoked.')
      }
    })
  }

  if (disabled || completed) {
    return iconOnly ? null : <span className="text-xs text-foreground-muted">{completed ? 'Share revoked' : 'Already revoked'}</span>
  }

  const trigger = (
    <DialogTrigger
      variant={iconOnly ? 'text' : compact ? 'text' : 'destructive'}
      size={iconOnly ? 'icon' : compact ? 'small' : undefined}
      aria-label={iconOnly ? 'Revoke share link' : undefined}
      icon={iconOnly ? <Trash2 className="size-3.5" aria-hidden="true" /> : <AlertTriangle className="size-4" aria-hidden="true" />}
      className={iconOnly ? '!size-8 !p-0 text-foreground-muted hover:bg-destructive/10 hover:text-destructive' : compact ? 'w-full justify-start gap-2 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive' : 'gap-2'}
    >
      {iconOnly ? <span className="sr-only">Revoke share link</span> : 'Revoke link'}
    </DialogTrigger>
  )

  return (
    <div className={compact || iconOnly ? undefined : 'flex flex-col items-end gap-2'}>
      <Dialog>
        {iconOnly ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>{trigger}</TooltipTrigger>
              <TooltipContent>Revoke link</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : trigger}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this share link?</DialogTitle>
            <DialogDescription>
              Anyone using this link will immediately lose access, including existing viewer sessions. The share record, analytics, and history will remain available.
            </DialogDescription>
          </DialogHeader>
          {error ? <Alert className="mt-4 border-destructive/40"><AlertTitle>Could not revoke share</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          {completed ? <Alert className="mt-4 border-success/40"><AlertTitle>Share revoked</AlertTitle><AlertDescription>All future viewer requests will be denied.</AlertDescription></Alert> : null}
          <DialogFooter>
            <DialogClose>Keep share</DialogClose>
            <Button type="button" variant="destructive" loading={isPending} onClick={confirmRevoke}>Revoke link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
