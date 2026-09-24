'use client'

import { CalendarClock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { updateShareExpiry } from '@/app/(admin)/dashboard/shares/[id]/actions'
import { Alert, AlertDescription, AlertTitle, Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Label, Select } from '@/components/ui'

export function UpdateShareExpiryButton({ shareId, currentExpiresAt, disabled = false, compact = false }: { shareId: string; currentExpiresAt: string | null; disabled?: boolean; compact?: boolean }) {
  const router = useRouter()
  const [value, setValue] = useState(currentExpiresAt ? '30' : 'never')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  function saveExpiry() {
    setError(null)
    const expiresAt = value === 'never' ? null : new Date(Date.now() + Number(value) * 24 * 60 * 60 * 1000).toISOString()
    startTransition(async () => {
      try {
        await updateShareExpiry({ shareId, expiresAt })
        setCompleted(true)
        router.refresh()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'The expiry could not be updated.')
      }
    })
  }

  if (disabled || completed) {
    return <span className="text-xs text-foreground-muted">{completed ? 'Expiry updated' : 'Expiry locked'}</span>
  }

  return (
    <Dialog>
      <DialogTrigger variant={compact ? 'text' : 'outline'} size={compact ? 'small' : undefined} className={compact ? 'w-full justify-start gap-2 px-2 text-xs' : 'gap-2'}>
        <CalendarClock className="size-4" aria-hidden="true" />
        Change expiry
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change share expiry</DialogTitle>
          <DialogDescription>Current viewer requests use the updated expiry immediately. Choose a new window or remove expiry.</DialogDescription>
        </DialogHeader>
        <div className="mt-5 space-y-2">
          <Label htmlFor="share-expiry-update">Expiry window</Label>
          <Select id="share-expiry-update" value={value} onChange={(event) => setValue(event.target.value)}>
            <option value="never">Never</option>
            <option value="7">7 days from now</option>
            <option value="30">30 days from now</option>
            <option value="90">90 days from now</option>
          </Select>
        </div>
        {error ? <Alert className="mt-4 border-destructive/40"><AlertTitle>Could not update expiry</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {completed ? <Alert className="mt-4 border-success/40"><AlertTitle>Expiry updated</AlertTitle><AlertDescription>The new expiry is now active for viewer requests.</AlertDescription></Alert> : null}
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <Button type="button" loading={isPending} onClick={saveExpiry}>Save expiry</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
