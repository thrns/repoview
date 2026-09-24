'use client'

import { useState, useTransition } from 'react'

import { updateRepositoryRules } from '@/app/(admin)/dashboard/repositories/actions'
import type { VisibilityRules } from '@/lib/security/visibility'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  Textarea,
} from '@/components/ui'

interface RepositoryRulesEditorProps {
  repositoryId: string
  repositoryName: string
  rules: VisibilityRules
}

export function RepositoryRulesEditor({ repositoryId, repositoryName, rules }: RepositoryRulesEditorProps) {
  const [hidden, setHidden] = useState(rules.hidden.join('\n'))
  const [allowOnly, setAllowOnly] = useState(rules.allowOnly.join('\n'))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function saveRules(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaved(false)

    startTransition(async () => {
      try {
        await updateRepositoryRules({
          repositoryId,
          hidden: toPatterns(hidden),
          allowOnly: toPatterns(allowOnly),
        })
        setSaved(true)
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Visibility rules could not be saved.')
      }
    })
  }

  return (
    <Dialog>
      <DialogTrigger variant="outline" className="h-8 min-w-28 justify-center px-2.5 text-xs">Edit policy</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Visibility policy</DialogTitle>
          <DialogDescription>
            Control which paths can appear in shares for {repositoryName}. Use one glob pattern per line.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={saveRules}>
          <div className="space-y-5 py-5">
            <div className="space-y-2">
              <Label htmlFor={`${repositoryId}-hidden`}>Hidden patterns</Label>
              <Textarea
                id={`${repositoryId}-hidden`}
                value={hidden}
                onChange={(event) => setHidden(event.target.value)}
                placeholder="**/.env*\n**/secrets/**"
                rows={7}
              />
              <p className="text-xs text-foreground-muted">Hidden paths are never fetched for a viewer.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${repositoryId}-allow-only`}>Allow-only patterns</Label>
              <Textarea
                id={`${repositoryId}-allow-only`}
                value={allowOnly}
                onChange={(event) => setAllowOnly(event.target.value)}
                placeholder="src/**\ndocs/**"
                rows={5}
              />
              <p className="text-xs text-foreground-muted">When present, a path must match at least one allow-only pattern.</p>
            </div>
            {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
            {saved ? <p className="text-sm text-success" role="status">Visibility policy saved.</p> : null}
          </div>
          <DialogFooter>
            <DialogClose>Cancel</DialogClose>
            <Button type="submit" variant="primary" loading={isPending}>Save policy</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function toPatterns(value: string) {
  return value.split('\n').map((pattern) => pattern.trim()).filter(Boolean)
}
