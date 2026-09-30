import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestCacheScope = vi.hoisted(() => ({ current: null as object | null }))

vi.mock('server-only', () => ({}))
vi.mock('react', () => ({
  cache: (fn: (...args: unknown[]) => unknown) => {
    const scopes = new WeakMap<object, Map<string, unknown>>()
    return (...args: unknown[]) => {
      const scope = requestCacheScope.current
      if (!scope) return fn(...args)

      let entries = scopes.get(scope)
      if (!entries) {
        entries = new Map()
        scopes.set(scope, entries)
      }

      const key = JSON.stringify(args)
      if (entries.has(key)) return entries.get(key)

      const result = fn(...args)
      entries.set(key, result)
      return result
    }
  },
}))
vi.mock('next/headers', () => ({ headers: vi.fn(async () => ({ get: () => null })) }))
vi.mock('@/lib/auth/viewer-access', () => ({ requireViewerRepositoryAccess: vi.fn() }))
vi.mock('@/lib/viewer/root-loader', () => ({ loadAuthorizedViewerRoot: vi.fn() }))
vi.mock('@/lib/viewer/tree-loader', () => ({ loadAuthorizedViewerTree: vi.fn() }))

import { requireViewerRepositoryAccess } from '@/lib/auth/viewer-access'
import { loadAuthorizedViewerRoot } from '@/lib/viewer/root-loader'
import { loadAuthorizedViewerTree } from '@/lib/viewer/tree-loader'
import { getViewerPageData } from '@/lib/viewer/page-data'

const requireAccess = vi.mocked(requireViewerRepositoryAccess)
const loadRoot = vi.mocked(loadAuthorizedViewerRoot)
const loadTree = vi.mocked(loadAuthorizedViewerTree)

const viewer = {
  repository: {
    id: 'repository-1',
    workspace_id: 'workspace-1',
    github_installation_id: 'installation-1',
    github_repository_id: 42,
    github_owner: 'octocat',
    github_repo: 'hello-world',
    default_rules: {},
  },
  share: { id: 'share-1', share_code: 'share-code', ref: 'heads/main', rules: {}, allow_download: false },
  session: { id: 'session-1', analytics_mode: 'necessary', gpc_applied: false },
  installationRecordId: 'installation-1',
  accessibleRepository: { owner: 'octocat', name: 'hello-world', fullName: 'octocat/hello-world' },
}

const treeState = { status: 'ready' as const, nodes: [] }
const rootState = { status: 'ready' as const, readme: null }

beforeEach(() => {
  vi.clearAllMocks()
  requestCacheScope.current = null
  requireAccess.mockResolvedValue(viewer as never)
  loadRoot.mockResolvedValue(rootState as never)
  loadTree.mockResolvedValue(treeState as never)
})

describe('viewer page data request memoization', () => {
  it('shares one authorization and data computation across layout and page calls in a render', async () => {
    const treeRequest = deferred<typeof treeState>()
    const rootRequest = deferred<typeof rootState>()
    loadTree.mockReturnValue(treeRequest.promise as never)
    loadRoot.mockReturnValue(rootRequest.promise as never)

    await runInRequest(async () => {
      const layoutData = getViewerPageData('share-code')
      const pageData = getViewerPageData('share-code')

      expect(layoutData).toBe(pageData)
      await vi.waitFor(() => {
        expect(requireAccess).toHaveBeenCalledOnce()
        expect(loadTree).toHaveBeenCalledOnce()
        expect(loadRoot).toHaveBeenCalledOnce()
      })

      treeRequest.resolve(treeState)
      rootRequest.resolve(rootState)
      await expect(Promise.all([layoutData, pageData])).resolves.toEqual([
        expect.objectContaining({ tree: treeState, root: rootState }),
        expect.objectContaining({ tree: treeState, root: rootState }),
      ])
    })
  })

  it('performs fresh authorization in a new HTTP request scope', async () => {
    await runInRequest(() => getViewerPageData('share-code'))
    await runInRequest(() => getViewerPageData('share-code'))

    expect(requireAccess).toHaveBeenCalledTimes(2)
    expect(loadTree).toHaveBeenCalledTimes(2)
    expect(loadRoot).toHaveBeenCalledTimes(2)
  })
})

async function runInRequest<T>(work: () => Promise<T>) {
  const previous = requestCacheScope.current
  requestCacheScope.current = {}
  try {
    return await work()
  } finally {
    requestCacheScope.current = previous
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => { resolve = complete })
  return { promise, resolve }
}
