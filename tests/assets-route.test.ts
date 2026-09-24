import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/viewer-access', () => ({ requireViewerRepositoryAccess: vi.fn() }))
vi.mock('../lib/security/rate-limit', () => ({ checkPublicRateLimit: vi.fn(async () => null), checkRateLimits: vi.fn(async () => null), getRequestIp: vi.fn(() => null), rateLimitResponse: vi.fn(), rateLimitUnavailableResponse: vi.fn() }))
vi.mock('../lib/github/contents', () => ({ loadRepositoryAsset: vi.fn() }))
vi.mock('../lib/security/visibility', () => ({ isPathAllowedForShare: vi.fn() }))

import { GET } from '../app/api/assets/[shareId]/[...path]/route'
import { requireViewerRepositoryAccess } from '../lib/auth/viewer-access'
import { loadRepositoryAsset } from '../lib/github/contents'
import { isPathAllowedForShare } from '../lib/security/visibility'

const requireAccess = vi.mocked(requireViewerRepositoryAccess)
const loadAsset = vi.mocked(loadRepositoryAsset)
const isAllowed = vi.mocked(isPathAllowedForShare)

const viewer = {
  repository: { id: 'repository-1', github_owner: 'octocat', github_repo: 'hello-world', workspace_id: 'workspace-1', default_rules: {}, github_installation_id: 'installation-record-1' },
  share: { id: 'share-123', workspace_id: 'workspace-1', ref: 'main', rules: {} },
  session: { id: 'session-123' },
  installationId: 5678,
  accessibleRepository: { owner: 'octocat', name: 'hello-world', fullName: 'octocat/hello-world' },
} as never

describe('protected Markdown asset route', () => {
  it('authorizes, filters, and returns safe image bytes with private headers', async () => {
    requireAccess.mockResolvedValue(viewer)
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
    requireAccess.mockRejectedValue(new Error('unauthorized'))
    const unauthorized = await GET(new Request('http://localhost'), { params: Promise.resolve({ shareId: 'share-123', path: ['docs', 'diagram.png'] }) })
    expect(unauthorized.status).toBe(404)

    requireAccess.mockResolvedValue(viewer)
    isAllowed.mockReturnValue(false)
    const hidden = await GET(new Request('http://localhost'), { params: Promise.resolve({ shareId: 'share-123', path: ['.env'] }) })
    expect(hidden.status).toBe(404)
    expect(loadAsset).not.toHaveBeenCalled()
  })

  it('does not replay a previously loaded private asset after authorization is removed', async () => {
    requireAccess.mockReset()
    loadAsset.mockReset()
    isAllowed.mockReset()
    isAllowed.mockReturnValue(true)
    requireAccess.mockResolvedValueOnce(viewer).mockRejectedValueOnce(new Error('repository access removed'))
    loadAsset.mockResolvedValue({ path: 'docs/diagram.png', size: 4, mediaType: 'image/png', bytes: Buffer.from('png!') })

    const firstResponse = await GET(new Request('http://localhost'), { params: Promise.resolve({ shareId: 'share-123', path: ['docs', 'diagram.png'] }) })
    expect(firstResponse.status).toBe(200)

    const afterAccessRemoval = await GET(new Request('http://localhost'), { params: Promise.resolve({ shareId: 'share-123', path: ['docs', 'diagram.png'] }) })
    expect(afterAccessRemoval.status).toBe(404)
    expect(loadAsset).toHaveBeenCalledTimes(1)
  })
})
