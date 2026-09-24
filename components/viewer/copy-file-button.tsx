'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../ui'
import { useViewerAnalytics } from './viewer-analytics'

export function CopyFileButton({ content, analyticsPath }: { content: string; analyticsPath?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const analytics = useViewerAnalytics()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      analytics.track('copy', analyticsPath ?? null, { content_kind: 'code', line_count: content.split(/\r?\n/).length })
      setStatus('copied')
      window.setTimeout(() => setStatus('idle'), 1800)
    } catch {
      setStatus('failed')
    }
  }

  const label = status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : 'Copy file'
  return (
    <Button type="button" variant="outline" size="small" onClick={copy} aria-label={label} title={label} icon={status === 'copied' ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />} className="px-2.5 sm:px-3">
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}
