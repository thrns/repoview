import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/viewer-session', () => ({ requireViewerSession: vi.fn() }))
vi.mock('@/lib/repositories/synchronize', () => ({ synchronizeRepositoryForGitHub: vi.fn() }))
vi.mock('@/lib/github/repositories', () => ({ getRepositoryMetadataById: vi.fn() }))
vi.mock('../lib/security/rate-limit', () => ({
  checkPublicRateLimit: vi.fn(async () => null),
  checkRateLimits: vi.fn(async () => null),
  rateLimitResponse: vi.fn(),
  rateLimitUnavailableResponse: vi.fn(),
}))

import { GET } from '../app/api/view/authorize/[shareId]/route'
import { requireViewerSession } from '@/lib/auth/viewer-session'
import { synchronizeRepositoryForGitHub } from '@/lib/repositories/synchronize'
import { getRepositoryMetadataById } from '@/lib/github/repositories'

const requireSession = vi.mocked(requireViewerSession)

beforeEach(() => {
  vi.clearAllMocks()
  requireSession.mockResolvedValue({ session: { id: 'session-1' } } as never)
})

describe('viewer authorization revalidation route', () => {
  it('returns a private no-store success without fetching repository content', async () => {
    const response = await GET(
      new Request('https://repoview.test/api/view/authorize/share-1'),
      { params: Promise.resolve({ shareId: 'share-1' }) },
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('vary')).toBe('Cookie')
    expect(requireSession).toHaveBeenCalledWith('share-1')
    expect(synchronizeRepositoryForGitHub).not.toHaveBeenCalled()
    expect(getRepositoryMetadataById).not.toHaveBeenCalled()
  })

  it('keeps authorization failures indistinguishable from a missing share', async () => {
    requireSession.mockRejectedValue(new Error('revoked share'))

    const response = await GET(
      new Request('https://repoview.test/api/view/authorize/share-1'),
      { params: Promise.resolve({ shareId: 'share-1' }) },
    )

    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
})
