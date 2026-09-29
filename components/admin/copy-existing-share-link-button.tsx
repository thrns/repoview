'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui'

export function CopyExistingShareLinkButton({ shareCode }: { shareCode: string }) {
  const [copied, setCopied] = useState(false)
  const resetTimeoutRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (resetTimeoutRef.current !== null) window.clearTimeout(resetTimeoutRef.current)
  }, [])

  async function copyShareLink() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? ''
    const shareUrl = `${appUrl}/s/${shareCode}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      if (resetTimeoutRef.current !== null) window.clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = window.setTimeout(() => {
        resetTimeoutRef.current = null
        setCopied(false)
      }, 1800)
    } catch {
      setCopied(false)
    }
  }

  const label = copied ? 'Copied' : 'Copy share link'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Button
            type="button"
            variant="text"
            size="icon"
            aria-label={label}
            onClick={() => { void copyShareLink() }}
            icon={copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
            className="!size-8 !p-0 text-foreground-muted hover:bg-surface-200 hover:text-foreground"
          >
            <span className="sr-only">{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
