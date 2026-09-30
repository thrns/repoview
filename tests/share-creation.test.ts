import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/workspace', () => ({
  requireRepositoryAccess: vi.fn(),
  requireWorkspaceRole: vi.fn(),
}))
vi.mock('../lib/security/rate-limit', () => ({ enforceAuthenticatedRateLimit: vi.fn() }))
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
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('../lib/env/public', () => ({ getPublicEnv: vi.fn(() => ({ NEXT_PUBLIC_APP_URL: 'https://repoview.test/' })) }))
vi.mock('../lib/audit-log', () => ({ AUDIT_ACTIONS: { shareCreated: 'share_created' }, recordAuditLogBestEffort: vi.fn() }))
vi.mock('../lib/security/tokens', () => ({
  generateShareCode: vi.fn(),
  hashShareToken: vi.fn((value: string) => `hash-${value}`),
}))

import { createShare } from '../app/(admin)/dashboard/shares/new/actions'
import { requireRepositoryAccess, requireWorkspaceRole } from '../lib/auth/workspace'
import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { generateShareCode } from '../lib/security/tokens'
import { finalizeResourceQuota, releaseQuota, releaseResourceQuota, reserveQuota, reserveResourceQuota } from '../lib/security/quotas'
import { listRegisteredRepositories } from '../lib/repositories/registry'
import { synchronizeRepositoryForGitHub } from '../lib/repositories/synchronize'
import { getRepositoryRef } from '../lib/github/repositories'
import { parseVisibilityRules } from '../lib/security/visibility'
import { recordAuditLogBestEffort } from '../lib/audit-log'

const access = vi.mocked(requireRepositoryAccess)
const role = vi.mocked(requireWorkspaceRole)
const createAdmin = vi.mocked(createSupabaseAdminClient)
const nextCode = vi.mocked(generateShareCode)
const reserveDaily = vi.mocked(reserveQuota)
const releaseDaily = vi.mocked(releaseQuota)
const reserveResource = vi.mocked(reserveResourceQuota)
const releaseResource = vi.mocked(releaseResourceQuota)
const finalizeResource = vi.mocked(finalizeResourceQuota)
const listRepositories = vi.mocked(listRegisteredRepositories)
const synchronize = vi.mocked(synchronizeRepositoryForGitHub)
const getRef = vi.mocked(getRepositoryRef)
const parseRules = vi.mocked(parseVisibilityRules)
const recordAudit = vi.mocked(recordAuditLogBestEffort)

const repository = {
  id: '11111111-1111-4111-8111-111111111111',
  workspace_id: 'workspace-1',
  github_owner: 'octocat',
  github_repo: 'hello-world',
  github_installation_id: 'installation-1',
  enabled: true,
}

function input(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  }
}

function createRpc(results: Array<{ data: unknown; error: unknown }> = []) {
  const rpc = vi.fn().mockImplementation(async (_name: string, args: { target_share_code: string }) => {
    return results.shift() ?? { data: [{ id: 'share-1', share_code: args.target_share_code }], error: null }
  })
  createAdmin.mockReturnValue({ rpc } as never)
  return rpc
}

beforeEach(() => {
  vi.clearAllMocks()
  nextCode.mockReset()
  nextCode.mockReturnValue('aB3xK9pQ2')
  access.mockResolvedValue({
    user: { id: 'user-1' },
    workspace: { id: 'workspace-1' },
  } as never)
  role.mockResolvedValue({ user: { id: 'user-1' }, workspace: { id: 'workspace-1' } } as never)
  reserveDaily.mockResolvedValue({ scope: 'shares-created-daily', workspaceId: 'workspace-1' } as never)
  releaseDaily.mockResolvedValue(undefined)
  reserveResource.mockResolvedValue({ scope: 'active-shares', workspaceId: 'workspace-1', resourceKey: 'share:key', reservationId: 'reservation-1', owned: true, expiresAt: '2026-09-29T01:00:00.000Z' })
  releaseResource.mockResolvedValue(undefined)
  finalizeResource.mockResolvedValue(undefined)
  listRepositories.mockResolvedValue([{ ...repository }] as never)
  synchronize.mockResolvedValue({ repository } as never)
  getRef.mockResolvedValue({ name: 'heads/main', sha: 'commit-sha' } as never)
  parseRules.mockReturnValue({ hidden: [], allowOnly: [] } as never)
  recordAudit.mockResolvedValue(true)
})

describe('atomic share creation', () => {
  it('creates a share without recipient details in one RPC call', async () => {
    const rpc = createRpc()

    const result = await createShare(input())

    expect(result.shareId).toBe('share-1')
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('create_share_with_recipient', expect.objectContaining({
      target_share_code: 'aB3xK9pQ2',
      target_token_hash: 'hash-aB3xK9pQ2',
      target_create_recipient: false,
      target_recipient_name: null,
    }))
  })

  it('creates the share and recipient in the same RPC call', async () => {
    const rpc = createRpc()

    await createShare(input({
      shareType: 'recipient',
      recipientName: 'Ada Lovelace',
      company: 'Analytical Engines',
      email: 'ada@example.com',
      roleNotes: 'Reviewer',
    }))

    expect(rpc).toHaveBeenCalledWith('create_share_with_recipient', expect.objectContaining({
      target_create_recipient: true,
      target_recipient_name: 'Ada Lovelace',
      target_company: 'Analytical Engines',
      target_email: 'ada@example.com',
      target_role_notes: 'Reviewer',
    }))
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('retries only a share_code collision and releases that attempt reservation', async () => {
    nextCode.mockReturnValueOnce('dupCode01').mockReturnValueOnce('aB3xK9pQ2')
    const duplicateError = { code: '23505', constraint: 'shares_share_code_idx', details: 'Key (share_code)=(dupCode01) already exists.' }
    const rpc = createRpc([
      { data: null, error: duplicateError },
      { data: [{ id: 'share-1', share_code: 'aB3xK9pQ2' }], error: null },
    ])

    const result = await createShare(input())

    expect(result).toMatchObject({
      shareCode: 'aB3xK9pQ2',
      shareUrl: 'https://repoview.test/view/aB3xK9pQ2',
    })
    expect(rpc.mock.calls.map(([, args]) => args.target_share_code)).toEqual(['dupCode01', 'aB3xK9pQ2'])
    expect(releaseResource).toHaveBeenCalledTimes(1)
    expect(finalizeResource).toHaveBeenCalledTimes(1)
  })

  it('does not retry an unrelated unique violation', async () => {
    const unrelatedError = { code: '23505', details: 'Key (token_hash)=(hash-aB3xK9pQ2) already exists.' }
    const rpc = createRpc([{ data: null, error: unrelatedError }])

    await expect(createShare(input())).rejects.toBe(unrelatedError)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(nextCode).toHaveBeenCalledTimes(1)
  })

  it('completes application authorization and validation before the RPC', async () => {
    const steps: string[] = []
    access.mockImplementation(async () => { steps.push('user-and-workspace'); return { user: { id: 'user-1' }, workspace: { id: 'workspace-1' } } as never })
    role.mockImplementation(async () => { steps.push('role'); return { user: { id: 'user-1' }, workspace: { id: 'workspace-1' } } as never })
    listRepositories.mockImplementation(async () => { steps.push('repository'); return [{ ...repository }] as never })
    synchronize.mockImplementation(async () => { steps.push('installation'); return { repository } as never })
    getRef.mockImplementation(async () => { steps.push('ref'); return { name: 'heads/main', sha: 'commit-sha' } as never })
    parseRules.mockImplementation(() => { steps.push('rules'); return { hidden: [], allowOnly: [] } as never })
    reserveResource.mockImplementation(async () => { steps.push('quota-reserved'); return { scope: 'active-shares', workspaceId: 'workspace-1', resourceKey: 'share:key', reservationId: 'reservation-1', owned: true, expiresAt: '2026-09-29T01:00:00.000Z' } })
    const rpc = createRpc()
    rpc.mockImplementation(async () => { steps.push('rpc'); return { data: [{ id: 'share-1', share_code: 'aB3xK9pQ2' }], error: null } })

    await createShare(input())

    expect(steps).toEqual(['user-and-workspace', 'role', 'repository', 'installation', 'ref', 'rules', 'quota-reserved', 'rpc'])
  })

  it('finalizes quota and emits audit only after the transaction succeeds', async () => {
    const steps: string[] = []
    reserveResource.mockImplementation(async () => { steps.push('reserve'); return { scope: 'active-shares', workspaceId: 'workspace-1', resourceKey: 'share:key', reservationId: 'reservation-1', owned: true, expiresAt: '2026-09-29T01:00:00.000Z' } })
    const rpc = createRpc()
    rpc.mockImplementation(async () => { steps.push('transaction'); return { data: [{ id: 'share-1', share_code: 'aB3xK9pQ2' }], error: null } })
    finalizeResource.mockImplementation(async () => { steps.push('finalize'); return undefined })
    recordAudit.mockImplementation(async () => { steps.push('audit'); return true })

    await createShare(input())

    expect(steps).toEqual(['reserve', 'transaction', 'finalize', 'audit'])
  })

  it('releases quotas and skips audit when the transaction fails', async () => {
    const failure = { code: '23514', message: 'recipient failure' }
    const rpc = createRpc([{ data: null, error: failure }])

    await expect(createShare(input({ shareType: 'recipient' }))).rejects.toBe(failure)

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(releaseResource).toHaveBeenCalledTimes(1)
    expect(releaseDaily).toHaveBeenCalledTimes(1)
    expect(finalizeResource).not.toHaveBeenCalled()
    expect(recordAudit).not.toHaveBeenCalled()
  })

  it('does not call the privileged RPC when workspace role authorization fails', async () => {
    const rpc = createRpc()
    role.mockRejectedValueOnce(new Error('admin required'))

    await expect(createShare(input())).rejects.toThrow('admin required')

    expect(rpc).not.toHaveBeenCalled()
    expect(reserveDaily).not.toHaveBeenCalled()
  })
})
