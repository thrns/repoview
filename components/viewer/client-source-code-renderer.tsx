'use client'

import { safeGeneratedHtml } from '@/lib/viewer/generated-html'

export function ClientSourceCodeRenderer({ code, highlightedHtml }: { code: string; highlightedHtml?: string }) {
  const safeHtml = highlightedHtml ? safeGeneratedHtml(highlightedHtml) : null

  if (safeHtml) {
    return <div className="source-code" dangerouslySetInnerHTML={{ __html: safeHtml }} />
  }

  return (
    <div className="source-code">
      <pre className="shiki plain-source"><code>{code}</code></pre>
    </div>
  )
}
