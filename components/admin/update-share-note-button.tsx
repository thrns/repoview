'use client'

import { FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { updateShareNote } from '@/app/(admin)/dashboard/shares/[id]/actions'
import { Alert, AlertDescription, AlertTitle, Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Textarea } from '@/components/ui'

export function UpdateShareNoteButton({ shareId, note, compact = false }: { shareId: string; note: string | null; compact?: boolean }) {
  const router = useRouter()
  const [value, setValue] = useState(note ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  function saveNote() {
    setError(null)
    startTransition(async () => {
      try {
        await updateShareNote({ shareId, note: value })
        setCompleted(true)
        router.refresh()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'The share note could not be updated.')
      }
    })
  }

  return (
    <Dialog>
      <DialogTrigger variant="text" size="small" className={compact ? 'shrink-0 gap-1.5 px-2 text-xs' : 'shrink-0 gap-1.5 px-2 text-xs'}>
        <FileText className="size-3.5" aria-hidden="true" />
        {note ? 'Edit note' : 'Add note'}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{note ? 'Edit share note' : 'Add a note'}</DialogTitle>
          <DialogDescription>Keep a private reminder about why this share exists or who it is for.</DialogDescription>
        </DialogHeader>
        <div className="mt-5">
          <Textarea value={value} onChange={(event) => setValue(event.target.value)} maxLength={2000} rows={5} placeholder="Context for this share" aria-label="Share note" />
          <p className="mt-1.5 text-right text-[11px] text-foreground-muted">{value.length}/2000</p>
        </div>
        {error ? <Alert className="mt-4 border-destructive/40"><AlertTitle>Could not update note</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {completed ? <Alert className="mt-4 border-success/40"><AlertTitle>Note updated</AlertTitle><AlertDescription>The private note is now saved to this share.</AlertDescription></Alert> : null}
        <DialogFooter>
          <DialogClose>{completed ? 'Done' : 'Cancel'}</DialogClose>
          {!completed ? <Button type="button" loading={isPending} onClick={saveNote}>Save note</Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
