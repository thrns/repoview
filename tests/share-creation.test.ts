import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/workspace', () => ({
  requireRepositoryAccess: vi.fn(async () => ({
    user: { id: 'user-1' },
    workspace: { id: 'workspace-1' },
  })),
  requireWorkspaceRole: vi.fn(async () => undefined),
}))
vi.mock('../lib/security/rate-limit', () => ({ enforceAuthenticatedRateLimit: vi.fn(async () => undefined) }))
vi.mock('../lib/repositories/registry', () => ({ listRegisteredRepositories: vi.fn() }))
vi.mock('../lib/repositories/synchronize', () => ({ synchronizeRepositoryForGitHub: vi.fn() }))
vi.mock('../lib/github/repositories', () => ({ getRepositoryRef: vi.fn() }))
vi.mock('../lib/security/visibility', () => ({ parseVisibilityRules: vi.fn() }))
vi.mock('../lib/security/quotas', () => ({
  reserveQuota: vi.fn(),
  releaseQuota: vi.fn(),
  reserveResourceQuota: vi.fn(),
  releaseResourceQuota: vi.fn(),
  finalizeResourceQuota: vi.fn(),
}))
vi.mock('../lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('../lib/env/public', () => ({ getPublicEnv: vi.fn(() => ({ NEXT_PUBLIC_APP_URL: 'https://repoview.test/' })) }))
vi.mock('../lib/audit-log', () => ({ AUDIT_ACTIONS: { shareCreated: 'share_created' }, recordAuditLogBestEffort: vi.fn(async () => undefined) }))
vi.mock('../lib/security/tokens', () => ({
  generateShareCode: vi.fn(),
  hashShareToken: vi.fn((value: string) => `hash-${value}`),
}))

import { createShare } from '../app/(admin)/dashboard/shares/new/actions'
import { createSupabaseServerClient } from '../lib/supabase/server'
import { generateShareCode } from '../lib/security/tokens'
import { releaseResourceQuota, reserveQuota, reserveResourceQuota } from '../lib/security/quotas'
import { listRegisteredRepositories } from '../lib/repositories/registry'
import { synchronizeRepositoryForGitHub } from '../lib/repositories/synchronize'
import { getRepositoryRef } from '../lib/github/repositories'
import { parseVisibilityRules } from '../lib/security/visibility'

const createServer = vi.mocked(createSupabaseServerClient)
const nextCode = vi.mocked(generateShareCode)
const reserveDaily = vi.mocked(reserveQuota)
const reserveResource = vi.mocked(reserveResourceQuota)
const releaseResource = vi.mocked(releaseResourceQuota)
const listRepositories = vi.mocked(listRegisteredRepositories)
const synchronize = vi.mocked(synchronizeRepositoryForGitHub)
const getRef = vi.mocked(getRepositoryRef)
const parseRules = vi.mocked(parseVisibilityRules)

const repository = {
  id: '11111111-1111-4111-8111-111111111111',
  workspace_id: 'workspace-1',
  github_owner: 'octocat',
  github_repo: 'hello-world',
  github_installation_id: 'installation-1',
  enabled: true,
}

function input() {
  return {
    repositoryId: repository.id,
    shareType: 'generic',
    recipientLabel: '',
    recipientName: '',
    company: '',
    email: '',
    roleNotes: '',
    ref: 'main',
    expiresAt: null,
    notifyOnView: true,
    allowDownload: false,
    note: '',
    hidden: [],
    allowOnly: [],
  }
}

function createShareQuery(results: Array<{ data: unknown; error: unknown }>) {
  const insert = vi.fn()
  const select = vi.fn()
  const single = vi.fn()
  insert.mockReturnThis()
  select.mockReturnThis()
  single.mockImplementation(async () => results.shift() ?? { data: null, error: new Error('missing test result') })
  return { insert, select, single }
}

beforeEach(() => {
  vi.clearAllMocks()
  nextCode.mockReset()
  reserveDaily.mockResolvedValue({} as never)
  reserveResource.mockResolvedValue({ scope: 'active-shares', workspaceId: 'workspace-1', resourceKey: 'share:key', reservationId: 'reservation-1', owned: true, expiresAt: '2026-09-29T01:00:00.000Z' })
  listRepositories.mockResolvedValue([{ ...repository, workspace_id: 'workspace-1' }] as never)
  synchronize.mockResolvedValue({ repository } as never)
  getRef.mockResolvedValue({ name: 'heads/main', sha: 'commit-sha' } as never)
  parseRules.mockReturnValue({ hidden: [], allowOnly: [] } as never)
})

describe('share creation capability codes', () => {
  it('retries only a share_code collision and returns the inserted code in the URL', async () => {
    nextCode.mockReturnValueOnce('dupCode01').mockReturnValueOnce('aB3xK9pQ2')
    const duplicateError = { code: '23505', details: 'Key (share_code)=(dupCode01) already exists.' }
    const shares = createShareQuery([
      { data: null, error: duplicateError },
      { data: { id: 'share-1', share_code: 'aB3xK9pQ2' }, error: null },
    ])
    createServer.mockResolvedValue({ from: vi.fn(() => shares) } as never)

    const result = await createShare(input())

    expect(result).toMatchObject({
      shareCode: 'aB3xK9pQ2',
      shareUrl: 'https://repoview.test/view/aB3xK9pQ2',
    })
    expect(result.shareCode).toMatch(/^[A-Za-z0-9]{9}$/)
    expect(result.shareUrl).toMatch(/\/view\/[A-Za-z0-9]{9}$/)
    expect(shares.insert).toHaveBeenNthCalledWith(1, expect.objectContaining({ share_code: 'dupCode01', token_hash: 'hash-dupCode01' }))
    expect(shares.insert).toHaveBeenNthCalledWith(2, expect.objectContaining({ share_code: 'aB3xK9pQ2', token_hash: 'hash-aB3xK9pQ2' }))
    expect(releaseResource).toHaveBeenCalledTimes(1)
  })

  it('does not reinterpret unrelated unique violations as code collisions', async () => {
    nextCode.mockReturnValue('aB3xK9pQ2')
    const unrelatedError = { code: '23505', details: 'Key (token_hash)=(hash-aB3xK9pQ2) already exists.' }
    const shares = createShareQuery([{ data: null, error: unrelatedError }])
    createServer.mockResolvedValue({ from: vi.fn(() => shares) } as never)

    await expect(createShare(input())).rejects.toBe(unrelatedError)
    expect(nextCode).toHaveBeenCalledTimes(1)
  })
})
