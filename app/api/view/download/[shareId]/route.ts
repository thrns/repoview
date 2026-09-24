import { NextResponse } from 'next/server'

import { requireViewerRepositoryAccess } from '@/lib/auth/viewer-access'
import { loadRepositoryFile } from '@/lib/github/contents'
import { normalizeRepositoryPath } from '@/lib/security/path'
import { isPathAllowedForShare } from '@/lib/security/visibility'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params
  const path = normalizeRepositoryPath(new URL(request.url).searchParams.get('path'))
  if (!path) return new NextResponse(null, { status: 400 })
  let viewer: Awaited<ReturnType<typeof requireViewerRepositoryAccess>>
  try { viewer = await requireViewerRepositoryAccess(shareId) } catch { return new NextResponse(null, { status: 404 }) }
  if (!viewer.share.allow_download || !isPathAllowedForShare(path, viewer.repository.default_rules, viewer.share.rules)) return new NextResponse(null, { status: 404 })
  try {
    const file = await loadRepositoryFile(
      viewer.accessibleRepository.owner,
      viewer.accessibleRepository.name,
      path,
      viewer.share.ref,
      viewer.installationId,
    )
    if (file.kind !== 'text') return new NextResponse(null, { status: 404 })
    return new NextResponse(file.content, { headers: { 'Cache-Control': 'private, no-store', 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${path.split('/').at(-1) || 'download.txt'}"` } })
  } catch { return new NextResponse(null, { status: 404 }) }
}
