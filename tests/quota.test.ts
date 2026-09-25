import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { createSupabaseAdminClient } from '../lib/supabase/admin'
import {
  QUOTA_POLICIES,
  QuotaExceededError,
  quotaResponse,
  reserveResourceQuota,
  reserveQuota,
} from '../lib/security/quotas'

const getAdmin = vi.mocked(createSupabaseAdminClient)

beforeEach(() => vi.clearAllMocks())

describe('workspace quotas', () => {
  it('uses a tenant-scoped atomic counter with a daily UTC period', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: true, usage: 3, remaining: 97, retry_after_seconds: 7200, reset_at: '2026-09-25T00:00:00.000Z' }],
      error: null,
    })
    const admin = { rpc } as never
    getAdmin.mockReturnValue(admin)

    await expect(reserveQuota('shares-created-daily', 'workspace-1', 'workspace', 3, new Date('2026-09-24T12:00:00.000Z'), admin)).resolves.toMatchObject({
      workspaceId: 'workspace-1',
      subjectId: 'workspace',
      periodStart: '2026-09-24T00:00:00.000Z',
      increment: 3,
    })
    expect(rpc).toHaveBeenCalledWith('consume_workspace_quota', expect.objectContaining({
      target_workspace_id: 'workspace-1',
      target_subject_id: 'workspace',
      target_period_start: '2026-09-24T00:00:00.000Z',
      target_limit: QUOTA_POLICIES['shares-created-daily'].limit,
      target_increment: 3,
    }))
  })

  it('returns a clear decision when a workspace quota is exhausted', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: false, usage: 100, remaining: 0, retry_after_seconds: 3600, reset_at: '2026-09-25T00:00:00.000Z' }],
      error: null,
    })
    const admin = { rpc } as never
    await expect(reserveQuota('shares-created-daily', 'workspace-1', 'workspace', 1, new Date('2026-09-24T12:00:00.000Z'), admin)).rejects.toMatchObject({
      name: 'QuotaExceededError',
      decision: { scope: 'shares-created-daily', usage: 100, limit: 100 },
    })
  })

  it('returns a machine-readable 429 with retry information', async () => {
    const error = new QuotaExceededError({
      scope: 'downloads-session',
      allowed: false,
      usage: 100,
      limit: 100,
      remaining: 0,
      resetAt: '2026-09-25T00:00:00.000Z',
      retryAfterSeconds: 3600,
    })
    const response = quotaResponse(error)

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('3600')
    expect(response.headers.get('x-quota-scope')).toBe('downloads-session')
    await expect(response.json()).resolves.toMatchObject({ error: 'quota_exceeded', limit: 100, usage: 100 })
  })

  it('uses the atomic resource reservation RPC for finite resources', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: true, already_reserved: false, usage: 4, remaining: 96, retry_after_seconds: 300, reservation_id: 'reservation-1' }],
      error: null,
    })
    const admin = { rpc } as never

    await expect(reserveResourceQuota('enabled-repositories', 'workspace-1', 'repository:repo-1', admin, new Date('2026-09-24T12:00:00.000Z'))).resolves.toMatchObject({
      reservationId: 'reservation-1',
      owned: true,
      resourceKey: 'repository:repo-1',
    })
    expect(rpc).toHaveBeenCalledWith('reserve_workspace_resource_quota', {
      target_scope: 'enabled-repositories',
      target_workspace_id: 'workspace-1',
      target_resource_key: 'repository:repo-1',
      target_limit: 100,
      target_expires_at: '2026-09-24T12:05:00.000Z',
    })
  })

  it('does not treat a denied resource reservation as an available slot', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: false, already_reserved: false, usage: 100, remaining: 0, retry_after_seconds: 300, reservation_id: null }],
      error: null,
    })

    await expect(reserveResourceQuota('active-shares', 'workspace-1', 'share:token-1', { rpc } as never)).rejects.toMatchObject({
      name: 'QuotaExceededError',
      decision: { scope: 'active-shares', usage: 100, limit: 1000 },
    })
  })
})
