import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/viewer-session', () => ({ requireViewerSession: vi.fn() }))
vi.mock('../lib/github/client', () => ({ getGitHubInstallationIdForRepository: vi.fn() }))
vi.mock('../lib/github/contents', () => ({ loadRepositoryAsset: vi.fn() }))
vi.mock('../lib/security/visibility', () => ({ isPathAllowedForShare: vi.fn() }))

import { GET } from '../app/api/assets/[shareId]/[...path]/route'
import { requireViewerSession } from '../lib/auth/viewer-session'
import { getGitHubInstallationIdForRepository } from '../lib/github/client'
import { loadRepositoryAsset } from '../lib/github/contents'
import { isPathAllowedForShare } from '../lib/security/visibility'

const requireSession = vi.mocked(requireViewerSession)
const getInstallationId = vi.mocked(getGitHubInstallationIdForRepository)
const loadAsset = vi.mocked(loadRepositoryAsset)
const isAllowed = vi.mocked(isPathAllowedForShare)

const viewer = {
  repository: { id: 'repository-1', github_owner: 'octocat', github_repo: 'hello-world', workspace_id: 'workspace-1', default_rules: {} },
  share: { workspace_id: 'workspace-1', ref: 'main', rules: {} },
} as never

describe('protected Markdown asset route', () => {
  it('authorizes, filters, and returns safe image bytes with private headers', async () => {
    requireSession.mockResolvedValue(viewer)
    getInstallationId.mockResolvedValue(5678)
    isAllowed.mockReturnValue(true)
    loadAsset.mockResolvedValue({ path: 'docs/diagram.png', size: 4, mediaType: 'image/png', bytes: Buffer.from('png!') })

    const response = await GET(new Request('http://localhost'), { params: Promise.resolve({ shareId: 'share-123', path: ['docs', 'diagram.png'] }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(await response.text()).toBe('png!')
    expect(loadAsset).toHaveBeenCalledWith('octocat', 'hello-world', 'docs/diagram.png', 'main', 5678)
  })

  it('returns not found for unauthorized or hidden paths without fetching bytes', async () => {
    loadAsset.mockClear()
    requireSession.mockRejectedValue(new Error('unauthorized'))
    const unauthorized = await GET(new Request('http://localhost'), { params: Promise.resolve({ shareId: 'share-123', path: ['docs', 'diagram.png'] }) })
    expect(unauthorized.status).toBe(404)

    requireSession.mockResolvedValue(viewer)
    isAllowed.mockReturnValue(false)
    const hidden = await GET(new Request('http://localhost'), { params: Promise.resolve({ shareId: 'share-123', path: ['.env'] }) })
    expect(hidden.status).toBe(404)
    expect(loadAsset).not.toHaveBeenCalled()
  })
})
