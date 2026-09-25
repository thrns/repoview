import { NextResponse } from 'next/server'

import { requireViewerRepositoryAccess } from '@/lib/auth/viewer-access'
import { checkPublicRateLimit, checkRateLimits, rateLimitResponse, rateLimitUnavailableResponse } from '../../../../../lib/security/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Revalidate viewer authorization without fetching GitHub file content. A
 * failed authorization stays deliberately indistinguishable from a missing
 * share to callers outside the viewer page.
 */
export async function GET(request: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params

  try {
    const decision = await checkPublicRateLimit(request, 'public-asset')
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  let viewer: Awaited<ReturnType<typeof requireViewerRepositoryAccess>>
  try {
    viewer = await requireViewerRepositoryAccess(shareId)
  } catch {
    return authorizationResponse(404)
  }

  try {
    const decision = await checkRateLimits('public-asset', [
      { value: `session:${viewer.session.id}` },
    ])
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  return authorizationResponse(204)
}

function authorizationResponse(status: 204 | 404) {
  return new NextResponse(null, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
    },
  })
}
