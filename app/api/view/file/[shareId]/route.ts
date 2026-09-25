import { after } from 'next/server'
import { NextResponse } from 'next/server'

import { requireViewerRepositoryAccess } from '@/lib/auth/viewer-access'
import { GitHubFileError, loadRepositoryFile } from '@/lib/github/contents'
import { normalizeRepositoryPath } from '@/lib/security/path'
import { isPathAllowedForShare } from '@/lib/security/visibility'
import { detectViewerLanguage } from '@/lib/viewer/language'
import { recordViewerViewEvent } from '@/lib/viewer/view-events'
import { isGlobalPrivacyControl } from '../../../../../lib/viewer/privacy-shared'
import { checkPublicRateLimit, checkRateLimits, rateLimitResponse, rateLimitUnavailableResponse } from '../../../../../lib/security/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const requestStartedAt = performance.now()
  const { shareId } = await params
  const requestedPath = normalizeRepositoryPath(new URL(request.url).searchParams.get('path'))

  if (!requestedPath) {
    return NextResponse.json({ error: 'invalid_path' }, { status: 400 })
  }

  try {
    const decision = await checkPublicRateLimit(request, 'public-asset')
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  let viewer: Awaited<ReturnType<typeof requireViewerRepositoryAccess>>
  const authStartedAt = performance.now()
  try {
    viewer = await requireViewerRepositoryAccess(shareId)
  } catch {
    return fileResponse({ error: 'not_authorized' }, 404, {
      auth: performance.now() - authStartedAt,
      total: performance.now() - requestStartedAt,
    })
  }
  const authMs = performance.now() - authStartedAt

  try {
    const decision = await checkRateLimits('public-asset', [
      { value: `session:${viewer.session.id}` },
    ])
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  if (!isPathAllowedForShare(requestedPath, viewer.repository.default_rules, viewer.share.rules)) {
    return fileResponse({ error: 'not_found' }, 404, { auth: authMs, total: performance.now() - requestStartedAt })
  }

  const githubStartedAt = performance.now()
  try {
    const file = await loadRepositoryFile(
      viewer.accessibleRepository.owner,
      viewer.accessibleRepository.name,
      requestedPath,
      viewer.share.ref,
      viewer.installationRecordId,
      viewer.repository.workspace_id,
      'system',
    )

    after(() => recordViewerViewEvent({
      shareId: viewer.share.id,
      sessionId: viewer.session.id,
      workspaceId: viewer.share.workspace_id,
      analyticsMode: viewer.session.analytics_mode === 'optional' ? 'optional' : 'necessary',
      gpcApplied: isGlobalPrivacyControl(request.headers.get('sec-gpc')),
      eventType: file.kind === 'text' && detectViewerLanguage(file.path) === 'markdown' ? 'markdown_viewed' : 'file_viewed',
      path: file.path,
      metadata: { route: 'client-file', preview: file.kind },
    }).catch(() => undefined))

    return fileResponse({ file }, 200, {
      auth: authMs,
      github: performance.now() - githubStartedAt,
      total: performance.now() - requestStartedAt,
    })
  } catch (error) {
    return fileResponse({ file: unavailableFile(requestedPath, getPreviewFailureReason(error)) }, 200, {
      auth: authMs,
      github: performance.now() - githubStartedAt,
      total: performance.now() - requestStartedAt,
    })
  }
}

function fileResponse(body: unknown, status: number, timings: Record<string, number>) {
  const response = NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })
  response.headers.set('Server-Timing', Object.entries(timings).map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`).join(', '))
  return response
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

function unavailableFile(path: string, reason: 'not-found' | 'rate-limited' | 'access' | 'unavailable') {
  return {
    kind: 'unavailable' as const,
    path,
    size: 0,
    reason,
    message: 'Preview unavailable.' as const,
  }
}
