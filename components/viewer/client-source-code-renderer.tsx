'use client'

import { useEffect, useState } from 'react'

import { Skeleton } from '@/components/ui'
import { detectViewerLanguage } from '@/lib/viewer/language'
import { safeGeneratedHtml } from '@/lib/viewer/generated-html'
import supabaseTheme from '../../design-system/lib/themes/supabase-2.json'

const SHIKI_THEME = supabaseTheme

let shikiModulePromise: Promise<typeof import('shiki')> | null = null

function loadShiki() {
  if (!shikiModulePromise) {
    shikiModulePromise = import('shiki').catch((error: unknown) => {
      shikiModulePromise = null
      throw error
    })
  }

  return shikiModulePromise
}

export function ClientSourceCodeRenderer({ code, filename }: { code: string; filename: string }) {
  const [result, setResult] = useState<{ filename: string; code: string; html: string | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadShiki().then(async ({ codeToHtml }) => {
      const rendered = await codeToHtml(code, {
        lang: detectViewerLanguage(filename),
        theme: SHIKI_THEME,
      })
      const html = safeGeneratedHtml(rendered)
      if (!cancelled) setResult({ filename, code, html })
    }).catch(() => {
      if (!cancelled) setResult({ filename, code, html: null })
    })

    return () => {
      cancelled = true
    }
  }, [code, filename])

  if (result?.filename === filename && result.code === code && result.html !== null) {
    return <div className="source-code" dangerouslySetInnerHTML={{ __html: result.html }} />
  }

  if (result?.filename === filename && result.code === code) {
    return <PlainSourceCode code={code} />
  }

  return (
    <div className="source-code space-y-3 p-6 sm:p-8" aria-busy="true" aria-label={`Rendering ${filename}`}>
      {Array.from({ length: 14 }, (_, index) => (
        <Skeleton key={index} className="h-4" style={{ width: `${55 + (index % 5) * 9}%` }} />
      ))}
    </div>
  )
}

function PlainSourceCode({ code }: { code: string }) {
  return (
    <div className="source-code">
      <pre className="shiki plain-source"><code>{code}</code></pre>
    </div>
  )
}
