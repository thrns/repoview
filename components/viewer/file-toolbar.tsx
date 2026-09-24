'use client'

import { Download, FileCode2 } from 'lucide-react'
import { useEffect } from 'react'
import { useViewerAnalytics } from './viewer-analytics'

import { CopyFileButton } from './copy-file-button'
import { RepositoryBreadcrumb } from './repository-breadcrumb'

export function FileToolbar({ path, size, language, content, shareId, allowDownload = false }: { path: string; size: number; language: string; content: string; shareId: string; allowDownload?: boolean }) {
  const analytics = useViewerAnalytics()
  useEffect(() => {
    if (language !== 'markdown') analytics.track('raw_file_viewed', path, { content_kind: language })
  }, [analytics, language, path])
  return (
    <div className="h-12">
      <header className="fixed inset-x-0 top-12 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:left-64">
        <div className="flex h-12 min-w-0 items-center gap-x-4 px-3 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FileCode2 className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <RepositoryBreadcrumb shareId={shareId} path={path} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-[11px] text-foreground-muted">{formatBytes(size)}</span>
          <span className="rounded border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-foreground-muted">{language}</span>
          <CopyFileButton content={content} analyticsPath={path} />
          {allowDownload ? <a href={`/api/view/download/${encodeURIComponent(shareId)}?path=${encodeURIComponent(path)}`} download className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => analytics.track('download', path, { content_kind: language })}><Download className="size-3.5" /><span className="hidden sm:inline">Download</span></a> : null}
        </div>
        </div>
      </header>
    </div>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
