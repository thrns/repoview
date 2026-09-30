import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ViewerAuthorizationFailure,
  revalidateViewerAuthorization,
} from '../lib/viewer/client-authorization'
import { ViewerFileCache } from '../lib/viewer/client-file-cache'

type TestFile = { path: string; content: string }

describe('private viewer file cache', () => {
  let authorized: boolean
  let authorize: ReturnType<typeof vi.fn<() => Promise<void>>>
  let load: ReturnType<typeof vi.fn<(path: string) => Promise<TestFile>>>

  beforeEach(() => {
    authorized = true
    authorize = vi.fn(async () => {
      if (!authorized) throw new ViewerAuthorizationFailure()
    })
    load = vi.fn(async (path: string) => ({ path, content: `private ${path}` }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not display a cached file after the share is revoked', async () => {
    const cache = new ViewerFileCache<TestFile>()

    await expect(cache.navigate('A', authorize, () => load('A'))).resolves.toEqual({ path: 'A', content: 'private A' })
    authorized = false

    await expect(cache.navigate('A', authorize, () => load('A'))).rejects.toBeInstanceOf(ViewerAuthorizationFailure)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('rejects and clears cached content when the authorize endpoint fails', async () => {
    const cache = new ViewerFileCache<TestFile>()
    await cache.prefetch('A', () => load('A'))
    const fetchMock = vi.fn(async () => new Response(null, { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(cache.navigate(
      'A',
      () => revalidateViewerAuthorization('share-1'),
      () => load('A'),
    )).rejects.toBeInstanceOf(ViewerAuthorizationFailure)

    expect(fetchMock).toHaveBeenCalledWith('/api/view/authorize/share-1', expect.objectContaining({ cache: 'no-store' }))
    expect(load).toHaveBeenCalledTimes(1)
    expect(cache.has('A')).toBe(false)
  })

  it('revalidates a prefetched file before navigation can display it', async () => {
    const cache = new ViewerFileCache<TestFile>()

    await cache.prefetch('B', () => load('B'))
    authorized = false

    await expect(cache.navigate('B', authorize, () => load('B'))).rejects.toBeInstanceOf(ViewerAuthorizationFailure)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('supports clearing every cached file after authorization failure', async () => {
    const cache = new ViewerFileCache<TestFile>()
    await cache.prefetch('A', () => load('A'))
    await cache.prefetch('B', () => load('B'))

    authorized = false
    await expect(cache.navigate('A', authorize, () => load('A'))).rejects.toBeInstanceOf(ViewerAuthorizationFailure)

    expect(cache.has('A')).toBe(false)
    expect(cache.has('B')).toBe(false)
  })

  it('keeps normal authorized navigation working without another content download', async () => {
    const cache = new ViewerFileCache<TestFile>()

    await expect(cache.navigate('README.md', authorize, () => load('README.md'))).resolves.toEqual({ path: 'README.md', content: 'private README.md' })
    await expect(cache.navigate('README.md', authorize, () => load('README.md'))).resolves.toEqual({ path: 'README.md', content: 'private README.md' })

    expect(authorize).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledTimes(1)
  })
})
