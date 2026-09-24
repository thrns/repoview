import { requireViewerSession } from '../../../../../lib/auth/viewer-session'
import { getGitHubInstallationIdForRepository } from '../../../../../lib/github/client'
import { loadRepositoryAsset } from '../../../../../lib/github/contents'
import { normalizeRepositoryPath } from '../../../../../lib/security/path'
import { isPathAllowedForShare } from '../../../../../lib/security/visibility'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareId: string; path: string[] }> },
) {
  const { shareId, path } = await params
  const responsePath = normalizeRepositoryPath(path.join('/'))

  let viewer: Awaited<ReturnType<typeof requireViewerSession>>
  try {
    viewer = await requireViewerSession(shareId)
  } catch {
    return notFoundResponse()
  }

  if (!responsePath || !isPathAllowedForShare(responsePath, viewer.repository.default_rules, viewer.share.rules)) {
    return notFoundResponse()
  }

  try {
    const installationId = await getGitHubInstallationIdForRepository(viewer.repository.id, viewer.repository.workspace_id)
    const asset = await loadRepositoryAsset(viewer.repository.github_owner, viewer.repository.github_repo, responsePath, viewer.share.ref, installationId)

    const headers = new Headers({
      'Cache-Control': 'private, no-store',
      'Content-Length': String(asset.bytes.byteLength),
      'Content-Type': asset.mediaType,
      'X-Content-Type-Options': 'nosniff',
    })
    if (asset.mediaType === 'image/svg+xml') {
      headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")
    }

    return new Response(asset.bytes as unknown as BodyInit, { headers })
  } catch {
    return notFoundResponse()
  }
}

function notFoundResponse() {
  return new Response(null, {
    status: 404,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
