import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { recordAuditLog, recordAuditLogBestEffort, sanitizeAuditMetadata } from '../lib/audit-log'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('workspace audit logging', () => {
  it('binds writes to a workspace member and strips sensitive metadata', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const admin = createAdminMock({ insert, membership: { workspace_id: 'workspace-a' } })

    await recordAuditLog({
      workspaceId: 'workspace-a',
      actorUserId: 'user-a',
      action: 'share_created',
      resourceType: 'share',
      resourceId: 'share-a',
      metadata: {
        repository: 'octocat/hello-world',
        token: 'bearer-token-must-not-persist',
        source: 'private repository source must not persist',
        nested: { password: 'secret', count: 2 },
        share_type: 'recipient',
        expires_at: null,
      },
    }, admin as never)

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      workspace_id: 'workspace-a',
      actor_user_id: 'user-a',
      actor_id: 'user-a',
      resource_id: 'share-a',
      metadata: { repository: 'octocat/hello-world', share_type: 'recipient', expires_at: null },
    }))
  })

  it('rejects actor attribution when the user is not a workspace member', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const admin = createAdminMock({ insert, membership: null })

    await expect(recordAuditLog({
      workspaceId: 'workspace-b',
      actorUserId: 'user-a',
      action: 'share_created',
      resourceType: 'share',
    }, admin as never)).rejects.toMatchObject({ name: 'AuditLogError' })
    expect(insert).not.toHaveBeenCalled()
  })

  it('keeps an unavailable audit store from changing the primary mutation result', async () => {
    const admin = createAdminMock({ insert: vi.fn().mockResolvedValue({ error: { message: 'offline' } }), membership: { workspace_id: 'workspace-a' } })
    await expect(recordAuditLogBestEffort({
      workspaceId: 'workspace-a',
      actorUserId: 'user-a',
      action: 'repository_enabled',
      resourceType: 'repository',
    }, admin as never)).resolves.toBe(false)
  })

  it('allows only the action schema and rejects arbitrary values', () => {
    const result = sanitizeAuditMetadata('account_setting_changed', {
      long: 'x'.repeat(600),
      token_hash: 'secret',
      list: Array.from({ length: 30 }, (_, index) => index),
      setting: 'profile',
      fields: ['full_name'],
      object_blob: { private: 'data' },
    }) as Record<string, unknown>

    expect(result).toEqual({ setting: 'profile', fields: ['full_name'] })
    expect(result).not.toHaveProperty('long')
    expect(result).not.toHaveProperty('token_hash')
    expect(result).not.toHaveProperty('object_blob')
  })

  it('drops metadata fields that are not allowed for an otherwise valid action', () => {
    const result = sanitizeAuditMetadata('share_revoked', {
      repository: 'octocat/private-repo',
      note: 'email body and repository source must not persist',
    })

    expect(result).toEqual({})
  })

  it('accepts only bounded failure codes for export failures', () => {
    expect(sanitizeAuditMetadata('account_export_failed', { reason: 'stream_failed' })).toEqual({ reason: 'stream_failed' })
    expect(sanitizeAuditMetadata('account_export_failed', { reason: 'email body: do not persist' })).toEqual({})
  })
})

function createAdminMock({ insert, membership }: { insert: ReturnType<typeof vi.fn>; membership: { workspace_id: string } | null }) {
  const membershipQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: membership, error: null }),
  }

  return {
    from(table: string) {
      if (table === 'workspace_members') return membershipQuery
      return { insert }
    },
  }
}
