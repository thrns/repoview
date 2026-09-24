'use client'

import { AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { revokeShare } from '@/app/(admin)/dashboard/shares/[id]/actions'
import { Alert, AlertDescription, AlertTitle, Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui'

export function RevokeShareButton({ shareId, disabled = false, compact = false }: { shareId: string; disabled?: boolean; compact?: boolean }) {
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
    return <span className="text-xs text-foreground-muted">{completed ? 'Share revoked' : 'Already revoked'}</span>
  }

  return (
    <div className={compact ? undefined : 'flex flex-col items-end gap-2'}>
      <Dialog>
        <DialogTrigger variant={compact ? 'text' : 'destructive'} size={compact ? 'small' : undefined} className={compact ? 'w-full justify-start gap-2 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive' : 'gap-2'}>
          <AlertTriangle className="size-4" aria-hidden="true" />
          Revoke share
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this share?</DialogTitle>
            <DialogDescription>
              Recipients will lose access immediately, including any existing viewer sessions. This cannot be undone; create a new share if access is needed again.
            </DialogDescription>
          </DialogHeader>
          {error ? <Alert className="mt-4 border-destructive/40"><AlertTitle>Could not revoke share</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          {completed ? <Alert className="mt-4 border-success/40"><AlertTitle>Share revoked</AlertTitle><AlertDescription>All future viewer requests will be denied.</AlertDescription></Alert> : null}
          <DialogFooter>
            <DialogClose>Keep share</DialogClose>
            <Button type="button" variant="destructive" loading={isPending} onClick={confirmRevoke}>Revoke now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
