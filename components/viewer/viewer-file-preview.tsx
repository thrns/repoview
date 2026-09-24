import type { GitHubFileContent } from '@/lib/github/contents'
import { detectViewerLanguage } from '@/lib/viewer/language'
import type { ViewerTreeState } from '@/lib/viewer/tree-model'

import { FileToolbar } from './file-toolbar'
import { MarkdownRenderer } from './markdown-renderer'
import { SourceCodeRenderer } from './source-code-renderer'
import { UnavailableFilePreview } from './file-unavailable-preview'

export type ViewerFilePreviewState = GitHubFileContent | {
  kind: 'unavailable'
  path: string
  size: number
  reason: 'not-found' | 'rate-limited' | 'access' | 'unavailable'
  message: 'Preview unavailable.'
}

export async function ViewerFilePreview({ file, shareId, tree, allowDownload = false }: { file: ViewerFilePreviewState; shareId: string; tree?: ViewerTreeState; allowDownload?: boolean }) {
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
          <MarkdownRenderer source={file.content} shareId={shareId} documentPath={file.path} tree={tree} />
        </div>
      ) : (
        <SourceCodeRenderer code={file.content} filename={file.path} />
      )}
    </section>
  )
}
