import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth/viewer-access', () => ({ requireViewerRepositoryAccess: vi.fn() }))
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

const requireAccess = vi.mocked(requireViewerRepositoryAccess)
const loadFile = vi.mocked(loadRepositoryFile)

beforeEach(() => {
  vi.clearAllMocks()
  requireAccess.mockRejectedValue(new Error('share, repository, or installation access removed'))
})

describe('viewer content routes', () => {
  it('does not return cached source content after authorization is removed', async () => {
    const response = await getFile(
      new Request('https://repoview.test/api/view/file/share-1?path=README.md'),
      { params: Promise.resolve({ shareId: 'share-1' }) },
    )

    expect(response.status).toBe(404)
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
})
