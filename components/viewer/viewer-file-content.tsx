'use client'

import { detectViewerLanguage } from '@/lib/viewer/language'
import type { ViewerTreeState } from '@/lib/viewer/tree-model'

import { ClientSourceCodeRenderer } from './client-source-code-renderer'
import { FileToolbar } from './file-toolbar'
import { MarkdownRendererClient } from './markdown-renderer-client'
import type { ViewerFilePreviewState } from './viewer-file-preview'
import { UnavailableFilePreview } from './file-unavailable-preview'

export function ViewerFileContent({ file, shareId, tree, onOpenPath, allowDownload = false }: { file: ViewerFilePreviewState; shareId: string; tree?: ViewerTreeState; onOpenPath?: (path: string) => void; allowDownload?: boolean }) {
  if (file.kind === 'image') {
    return <UnavailableFilePreview file={{ kind: 'unavailable', path: file.path, size: file.size, reason: 'image', message: 'Preview unavailable.' }} />
  }

  if (file.kind === 'unavailable') {
    return <UnavailableFilePreview file={file} />
  }

  const language = detectViewerLanguage(file.path)

  return (
    <section className="min-h-[calc(100vh-3rem)] bg-background">
      <FileToolbar path={file.path} size={file.size} language={language} content={file.content} shareId={shareId} allowDownload={allowDownload} />
      {language === 'markdown' ? (
        <div className="repository-markdown-page">
          <MarkdownRendererClient key={file.path} source={file.content} shareId={shareId} documentPath={file.path} tree={tree} onOpenPath={onOpenPath} />
        </div>
      ) : (
        <ClientSourceCodeRenderer key={file.path} code={file.content} filename={file.path} />
      )}
    </section>
  )
}
