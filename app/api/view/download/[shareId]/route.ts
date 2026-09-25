import { NextResponse } from 'next/server'

import { requireViewerRepositoryAccess } from '@/lib/auth/viewer-access'
import { loadRepositoryFile } from '@/lib/github/contents'
import { normalizeRepositoryPath } from '@/lib/security/path'
import { isPathAllowedForShare } from '@/lib/security/visibility'
import { checkPublicRateLimit, checkRateLimits, rateLimitResponse, rateLimitUnavailableResponse } from '../../../../../lib/security/rate-limit'
import { QuotaExceededError, QuotaUnavailableError, quotaResponse, quotaUnavailableResponse, reserveQuota } from '../../../../../lib/security/quotas'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params
  const path = normalizeRepositoryPath(new URL(request.url).searchParams.get('path'))
  if (!path) return new NextResponse(null, { status: 400 })
  try {
    const decision = await checkPublicRateLimit(request, 'public-download')
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }
  let viewer: Awaited<ReturnType<typeof requireViewerRepositoryAccess>>
  try { viewer = await requireViewerRepositoryAccess(shareId) } catch { return new NextResponse(null, { status: 404 }) }
  try {
    const decision = await checkRateLimits('public-download', [
      { value: `session:${viewer.session.id}` },
      { value: `share:${viewer.share.id}` },
    ])
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }
  if (!viewer.share.allow_download || !isPathAllowedForShare(path, viewer.repository.default_rules, viewer.share.rules)) return new NextResponse(null, { status: 404 })
  try {
    await reserveQuota('downloads-session', viewer.share.workspace_id, viewer.session.id)
  } catch (error) {
    if (error instanceof QuotaExceededError) return quotaResponse(error)
    if (error instanceof QuotaUnavailableError) return quotaUnavailableResponse()
    return new NextResponse(null, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' } })
  }
  try {
    const file = await loadRepositoryFile(
      viewer.accessibleRepository.owner,
      viewer.accessibleRepository.name,
      path,
      viewer.share.ref,
      viewer.installationRecordId,
      viewer.repository.workspace_id,
      'system',
    )
    if (file.kind !== 'text') return new NextResponse(null, { status: 404 })
    return new NextResponse(file.content, { headers: { 'Cache-Control': 'private, no-store', 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${path.split('/').at(-1) || 'download.txt'}"` } })
  } catch { return new NextResponse(null, { status: 404 }) }
}
