'use client'

import { Download, FileCode2 } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui'
import { useViewerAnalytics } from './viewer-analytics'

import { CopyFileButton } from './copy-file-button'
import { RepositoryBreadcrumb } from './repository-breadcrumb'

export function FileToolbar({ path, size, language, content, shareId, allowDownload = false }: { path: string; size: number; language: string; content: string; shareId: string; allowDownload?: boolean }) {
  const analytics = useViewerAnalytics()
  useEffect(() => {
    if (language !== 'markdown') analytics.track('raw_file_viewed', path, { content_kind: language })
  }, [analytics, language, path])
  return (
    <header className="viewer-file-toolbar shrink-0 border-b border-border bg-surface-100 z-20">
      <div className="viewer-file-toolbar-inner flex min-h-11 min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FileCode2 className="size-3.5 shrink-0 text-foreground-light" aria-hidden="true" />
          <RepositoryBreadcrumb shareId={shareId} path={path} />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="hidden font-mono text-xs text-foreground-muted sm:inline" title={`File size: ${formatBytes(size)}`}>{formatBytes(size)}</span>
          <span className="hidden rounded border border-border bg-muted/40 px-1.5 py-1 font-mono text-xs font-medium uppercase tracking-wider text-foreground-muted sm:inline-flex">{language}</span>
          <CopyFileButton content={content} analyticsPath={path} />
          {allowDownload ? <Button asChild variant="outline" size="small" className="px-2.5 sm:px-3"><a href={`/api/view/download/${encodeURIComponent(shareId)}?path=${encodeURIComponent(path)}`} download aria-label="Download file" onClick={() => analytics.track('download', path, { content_kind: language })}><Download className="size-3.5" aria-hidden="true" /><span className="hidden sm:inline">Download</span></a></Button> : null}
        </div>
      </div>
    </header>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
