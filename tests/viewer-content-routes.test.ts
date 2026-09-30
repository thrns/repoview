import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/viewer-access', () => ({ requireViewerRepositoryAccess: vi.fn() }))
vi.mock('../lib/security/rate-limit', () => ({ checkPublicRateLimit: vi.fn(async () => null), checkRateLimits: vi.fn(async () => null), getRequestIp: vi.fn(() => null), rateLimitResponse: vi.fn(), rateLimitUnavailableResponse: vi.fn() }))
vi.mock('@/lib/security/quotas', () => ({
  QuotaExceededError: class QuotaExceededError extends Error {},
  QuotaUnavailableError: class QuotaUnavailableError extends Error {},
  quotaResponse: vi.fn(),
  quotaUnavailableResponse: vi.fn(),
  reserveQuota: vi.fn(async () => ({})),
}))
vi.mock('@/lib/github/contents', () => ({
  GitHubFileError: class GitHubFileError extends Error {},
  loadRepositoryFile: vi.fn(),
}))
vi.mock('@/lib/security/path', () => ({ normalizeRepositoryPath: (value: string | null) => value }))
vi.mock('@/lib/security/visibility', () => ({ isPathAllowedForShare: vi.fn() }))
vi.mock('@/lib/viewer/language', () => ({ detectViewerLanguage: vi.fn() }))
vi.mock('@/lib/viewer/view-events', () => ({ recordViewerViewEvent: vi.fn() }))

import { GET as getFile } from '../app/api/view/file/[shareId]/route'
import { GET as downloadFile } from '../app/api/view/download/[shareId]/route'
import { requireViewerRepositoryAccess } from '@/lib/auth/viewer-access'
import { loadRepositoryFile } from '@/lib/github/contents'
import { isPathAllowedForShare } from '@/lib/security/visibility'

const requireAccess = vi.mocked(requireViewerRepositoryAccess)
const loadFile = vi.mocked(loadRepositoryFile)
const isPathAllowed = vi.mocked(isPathAllowedForShare)

beforeEach(() => {
  vi.clearAllMocks()
  requireAccess.mockRejectedValue(new Error('share, repository, or installation access removed'))
  isPathAllowed.mockReturnValue(true)
})

describe('viewer content routes', () => {
  it('does not return cached source content after authorization is removed', async () => {
    const response = await getFile(
      new Request('https://repoview.test/api/view/file/share-1?path=README.md'),
      { params: Promise.resolve({ shareId: 'share-1' }) },
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'not_authorized' })
    expect(loadFile).not.toHaveBeenCalled()
  })

  it('does not return cached download content after authorization is removed', async () => {
    const response = await downloadFile(
      new Request('https://repoview.test/api/view/download/share-1?path=README.md'),
      { params: Promise.resolve({ shareId: 'share-1' }) },
    )

    expect(response.status).toBe(404)
    expect(loadFile).not.toHaveBeenCalled()
  })

  it('returns safe Content-Disposition for unusual repository basenames', async () => {
    requireAccess.mockResolvedValue({
      session: { id: 'session-1' },
      share: { id: 'share-1', workspace_id: 'workspace-1', ref: 'refs/heads/main', allow_download: true, rules: {} },
      repository: { workspace_id: 'workspace-1', default_rules: {} },
      accessibleRepository: { owner: 'octocat', name: 'hello-world', fullName: 'octocat/hello-world' },
      installationRecordId: 'installation-1',
    } as Awaited<ReturnType<typeof requireViewerRepositoryAccess>>)
    loadFile.mockResolvedValue({ kind: 'text', content: 'readme contents' } as Awaited<ReturnType<typeof loadRepositoryFile>>)
    const unusualPath = 'folder/read\r\nme "Café".md'
    const url = new URL('https://repoview.test/api/view/download/share-1')
    url.searchParams.set('path', unusualPath)

    const response = await downloadFile(
      new Request(url),
      { params: Promise.resolve({ shareId: 'share-1' }) },
    )

    expect(response.status).toBe(200)
    const disposition = response.headers.get('Content-Disposition')
    expect(disposition).toBe('attachment; filename="read__me _Caf__.md"; filename*=UTF-8\'\'read__me%20%22Caf%C3%A9%22.md')
    expect(disposition).not.toMatch(/[\r\n]/)
  })
})
