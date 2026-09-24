import { FileWarning, LockKeyhole } from 'lucide-react'

export type UnavailableFileState = {
  kind: 'unavailable'
  path: string
  size: number
  reason: 'binary' | 'oversized' | 'image' | 'not-found' | 'rate-limited' | 'access' | 'unavailable'
  message: 'Preview unavailable.'
}

export function UnavailableFilePreview({ file }: { file: UnavailableFileState }) {
  const description = file.reason === 'binary'
    ? 'This file contains binary data and is not rendered as text.'
    : file.reason === 'oversized'
      ? 'This file is larger than the inline preview limit.'
      : file.reason === 'image'
        ? 'This image is reserved for a protected image preview.'
      : file.reason === 'not-found'
        ? 'This file is not available in the authorized share.'
      : file.reason === 'rate-limited'
        ? 'GitHub’s file service is rate-limited. Try again later.'
      : file.reason === 'access'
        ? 'The configured GitHub App can no longer read this file.'
        : 'This file preview is temporarily unavailable.'

  return (
    <section className="repository-file-page min-h-[calc(100vh-3rem)]">
      <div className="border-b border-border px-3 py-3 sm:px-5">
        <p className="font-mono text-xs text-foreground-muted">{file.path}</p>
      </div>
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <FileWarning className="mx-auto size-5 text-foreground-muted" aria-hidden="true" />
        <h1 className="mt-3 font-heading text-lg font-semibold">Preview unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-foreground-muted">{description}</p>
        <div className="mt-4 flex justify-center gap-2 text-xs text-foreground-muted">
          <LockKeyhole className="size-3.5" aria-hidden="true" />
          No file bytes were rendered in this state.
        </div>
        {file.size > 0 ? <p className="mt-2 text-xs text-foreground-muted">File size: {formatBytes(file.size)}</p> : null}
      </div>
    </section>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
