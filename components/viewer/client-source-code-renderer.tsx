'use client'

import { useEffect, useState } from 'react'

import { Skeleton } from '@/components/ui'
import { detectViewerLanguage } from '@/lib/viewer/language'

const SHIKI_THEMES = {
  light: 'github-light-default',
  dark: 'github-dark-default',
} as const

export function ClientSourceCodeRenderer({ code, filename }: { code: string; filename: string }) {
  const [result, setResult] = useState<{ input: string; html?: string; failed?: boolean } | null>(null)
  const input = `${filename}\0${code}`

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      void import('shiki').then(async ({ codeToHtml }) => {
        try {
          const rendered = await codeToHtml(code, {
            lang: detectViewerLanguage(filename),
            themes: SHIKI_THEMES,
          })
          if (!cancelled) setResult({ input, html: rendered })
        } catch {
          if (!cancelled) setResult({ input, failed: true })
        }
      }).catch(() => {
        if (!cancelled) setResult({ input, failed: true })
      })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [code, filename, input])

  if (result?.input === input && result.html) {
    return <div className="source-code" dangerouslySetInnerHTML={{ __html: result.html }} />
  }

  if (result?.input === input && result.failed) {
    return <div className="source-code px-6 py-8 text-sm text-foreground-muted" role="status">Unable to render this file preview.</div>
  }

  return (
    <div className="source-code space-y-3 p-6 sm:p-8" aria-busy="true" aria-label={`Rendering ${filename}`}>
      {Array.from({ length: 14 }, (_, index) => (
        <Skeleton key={index} className="h-4" style={{ width: `${55 + (index % 5) * 9}%` }} />
      ))}
    </div>
  )
}
