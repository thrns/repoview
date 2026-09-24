import { after } from 'next/server'
import { ViewerFilePreview, type ViewerFilePreviewState } from '@/components/viewer/viewer-file-preview'
import { GitHubFileError, loadRepositoryFile } from '@/lib/github/contents'
import { normalizeRepositoryPath } from '@/lib/security/path'
import { isPathAllowedForShare } from '@/lib/security/visibility'
import { detectViewerLanguage } from '@/lib/viewer/language'
import { getViewerPageData } from '@/lib/viewer/page-data'
import { recordViewerViewEvent } from '@/lib/viewer/view-events'

export const dynamic = 'force-dynamic'

export default async function ViewerFilePage({ params }: { params: Promise<{ shareId: string; path: string[] }> }) {
  const { shareId, path } = await params

  let data: Awaited<ReturnType<typeof getViewerPageData>>
  try {
    data = await getViewerPageData(shareId)
  } catch {
    return <ViewerFilePreview file={unavailableFile(path.join('/'), 'not-found')} shareId={shareId} />
  }

  const requestedPath = normalizeRepositoryPath(path.join('/'))
  if (!requestedPath || !isPathAllowedForShare(requestedPath, data.repositoryRules, data.shareRules)) {
    return <ViewerFilePreview file={unavailableFile(requestedPath ?? path.join('/'), 'not-found')} shareId={shareId} />
  }

  try {
    const file = await loadRepositoryFile(
      data.repositoryOwner,
      data.repositorySlug,
      requestedPath,
      data.refName,
    )
    after(() => recordViewerViewEvent({
      shareId: data.internalShareId,
      sessionId: data.sessionId,
      eventType: file.kind === 'text' && detectViewerLanguage(file.path) === 'markdown' ? 'markdown_viewed' : 'file_viewed',
      path: file.path,
      metadata: { route: 'blob', preview: file.kind },
    }).catch(() => undefined))
    const tree = file.kind === 'text' && detectViewerLanguage(file.path) === 'markdown' ? data.tree : undefined
    return <ViewerFilePreview file={file} shareId={shareId} tree={tree} />
  } catch (error) {
    return <ViewerFilePreview file={unavailableFile(requestedPath, getPreviewFailureReason(error))} shareId={shareId} />
  }
}

function getPreviewFailureReason(error: unknown): 'not-found' | 'rate-limited' | 'access' | 'unavailable' {
  if (!(error instanceof GitHubFileError)) {
    return 'unavailable'
  }

  if (error.code === 'not_found' || error.code === 'not_a_file' || error.code === 'invalid_path') {
    return 'not-found'
  }
  if (error.code === 'rate_limited') {
    return 'rate-limited'
  }
  if (error.code === 'unauthorized' || error.code === 'forbidden') {
    return 'access'
  }
  return 'unavailable'
}

function unavailableFile(path: string, reason: 'not-found' | 'rate-limited' | 'access' | 'unavailable'): ViewerFilePreviewState {
  return {
    kind: 'unavailable',
    path: path || 'Unknown file',
    size: 0,
    reason,
    message: 'Preview unavailable.',
  }
}
