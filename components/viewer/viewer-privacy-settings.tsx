'use client'

import { Check, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogSection, DialogTitle, DialogTrigger } from '@/components/ui'
import type { ViewerAnalyticsMode } from '@/lib/viewer/privacy'

import { useViewerAnalytics } from './viewer-analytics'

export function ViewerPrivacySettings({ shareId }: { shareId: string }) {
  const analytics = useViewerAnalytics()
  const [saving, setSaving] = useState<ViewerAnalyticsMode | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updatePreference = async (requestedMode: ViewerAnalyticsMode) => {
    setSaving(requestedMode)
    setError(null)
    try {
      const response = await fetch('/api/view/privacy', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shareId, analyticsMode: requestedMode }),
      })
      const payload = await response.json() as { analyticsMode?: ViewerAnalyticsMode; gpc?: boolean; error?: string }
      if (!response.ok || (payload.analyticsMode !== 'necessary' && payload.analyticsMode !== 'optional')) {
        throw new Error(payload.error ?? 'Privacy settings could not be saved.')
      }
      analytics.setAnalyticsPreference(payload.analyticsMode, payload.gpc === true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Privacy settings could not be saved.')
    } finally {
      setSaving(null)
    }
  }

  const currentMode = analytics.gpcApplied ? 'necessary' : analytics.analyticsMode

  return (
    <Dialog>
      <DialogTrigger
        variant="ghost"
        size="small"
        icon={<ShieldCheck className="size-3.5" aria-hidden="true" />}
        className="text-foreground-muted hover:text-foreground"
        aria-label="Open Privacy / Analytics Settings"
      >
        Privacy / Analytics
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Privacy / Analytics Settings</DialogTitle>
          <DialogDescription>
            Repository access works either way. Necessary security processing stays on to protect the share; optional analytics helps the owner understand engagement.
          </DialogDescription>
        </DialogHeader>

        {analytics.gpcApplied ? (
          <div className="mt-5 rounded-md border border-border bg-muted/50 p-3 text-sm leading-5 text-foreground-muted" role="status">
            Global Privacy Control is on in this browser, so optional analytics stays off for this share.
          </div>
        ) : null}

        <DialogSection>
          <div className="space-y-3">
            <PreferenceOption
              title="Necessary only"
              description="Share authentication, session security, abuse detection, rate limiting, bot detection, and security logs. No persistent viewer identity or detailed engagement profile."
              selected={currentMode === 'necessary'}
              disabled={saving !== null}
              loading={saving === 'necessary'}
              onClick={() => updatePreference('necessary')}
            />
            <PreferenceOption
              title="Optional engagement analytics"
              description="Adds returning-viewer recognition, file order and duration, search/copy/download events, and coarse browser, device, and location context for this share."
              selected={currentMode === 'optional'}
              disabled={saving !== null || analytics.gpcApplied}
              loading={saving === 'optional'}
              onClick={() => updatePreference('optional')}
            />
          </div>
        </DialogSection>

        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}

        <p className="text-xs leading-5 text-foreground-muted">
          You can change this choice later from the Privacy button. Read the <a className="underline underline-offset-2 hover:text-foreground" href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a> for details.
        </p>

        <DialogFooter>
          <DialogClose>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PreferenceOption({
  title,
  description,
  selected,
  disabled,
  loading,
  onClick,
}: {
  title: string
  description: string
  selected: boolean
  disabled: boolean
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="flex min-h-11 w-full items-start gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-input" aria-hidden="true">
        {selected ? <Check className="size-3 text-primary" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{title}{loading ? '…' : ''}</span>
        <span className="mt-1 block text-xs leading-5 text-foreground-muted">{description}</span>
      </span>
    </button>
  )
}
