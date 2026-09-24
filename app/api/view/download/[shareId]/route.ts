import { NextResponse } from 'next/server'

import { requireViewerSession } from '@/lib/auth/viewer-session'
import { getGitHubInstallationIdForRepository } from '@/lib/github/client'
import { loadRepositoryFile } from '@/lib/github/contents'
import { normalizeRepositoryPath } from '@/lib/security/path'
import { isPathAllowedForShare } from '@/lib/security/visibility'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params
  const path = normalizeRepositoryPath(new URL(request.url).searchParams.get('path'))
  if (!path) return new NextResponse(null, { status: 400 })
  let viewer: Awaited<ReturnType<typeof requireViewerSession>>
  try { viewer = await requireViewerSession(shareId) } catch { return new NextResponse(null, { status: 404 }) }
  if (!viewer.share.allow_download || !isPathAllowedForShare(path, viewer.repository.default_rules, viewer.share.rules)) return new NextResponse(null, { status: 404 })
  try {
    const installationId = await getGitHubInstallationIdForRepository(viewer.repository.id, viewer.repository.workspace_id)
    const file = await loadRepositoryFile(viewer.repository.github_owner, viewer.repository.github_repo, path, viewer.share.ref, installationId)
    if (file.kind !== 'text') return new NextResponse(null, { status: 404 })
    return new NextResponse(file.content, { headers: { 'Cache-Control': 'private, no-store', 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${path.split('/').at(-1) || 'download.txt'}"` } })
  } catch { return new NextResponse(null, { status: 404 }) }
}
