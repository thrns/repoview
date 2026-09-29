import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/workspace', () => ({
  requireShareAccess: vi.fn(async () => ({ user: { id: 'user-1' }, workspace: { id: 'workspace-1' }, share: {} })),
  requireWorkspaceRole: vi.fn(async () => undefined),
}))
vi.mock('../lib/security/rate-limit', () => ({ enforceAuthenticatedRateLimit: vi.fn(async () => undefined) }))
vi.mock('../lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('../lib/security/tokens', () => ({ generateShareCode: vi.fn(() => 'aB3xK9pQ2'), hashShareToken: vi.fn(() => 'new-token-hash') }))
vi.mock('../lib/env/public', () => ({ getPublicEnv: vi.fn(() => ({ NEXT_PUBLIC_APP_URL: 'https://code.thrn.im/' })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { revokeShare, rotateShare, updateShareExpiry } from '../app/(admin)/dashboard/shares/[id]/actions'
import { requireShareAccess, requireWorkspaceRole } from '../lib/auth/workspace'
import { createSupabaseServerClient } from '../lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateShareCode } from '../lib/security/tokens'

const shareId = '11111111-1111-4111-8111-111111111111'

describe('revoke share action', () => {
  it('requires workspace admin access, timestamps revocation, and revalidates share views', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: shareId }, error: null })
    const builder = {
      update: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      is: vi.fn(() => builder),
      select: vi.fn(() => builder),
      maybeSingle,
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ from: vi.fn(() => builder) } as never)

    await expect(revokeShare(shareId)).resolves.toEqual({ revoked: true })
    expect(requireShareAccess).toHaveBeenCalledWith(shareId)
    expect(requireWorkspaceRole).toHaveBeenCalledWith('workspace-1', ['owner', 'admin'])
    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ revoked_at: expect.any(String) }))
    expect(builder.is).toHaveBeenCalledWith('revoked_at', null)
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/shares')
    expect(revalidatePath).toHaveBeenCalledWith(`/dashboard/shares/${shareId}`)
  })

  it('rejects invalid IDs and already revoked rows', async () => {
    await expect(revokeShare('not-a-uuid')).rejects.toThrow()

    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const builder = { update: vi.fn(() => builder), eq: vi.fn(() => builder), is: vi.fn(() => builder), select: vi.fn(() => builder), maybeSingle }
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ from: vi.fn(() => builder) } as never)
    await expect(revokeShare(shareId)).rejects.toThrow('already revoked')
  })

  it('validates and updates future expiry values, including clearing expiry', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: shareId }, error: null })
    const builder = { update: vi.fn(() => builder), eq: vi.fn(() => builder), select: vi.fn(() => builder), maybeSingle }
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ from: vi.fn(() => builder) } as never)

    await expect(updateShareExpiry({ shareId, expiresAt: '2027-01-01T00:00:00.000Z' })).resolves.toMatchObject({ updated: true })
    expect(builder.update).toHaveBeenCalledWith({ expires_at: '2027-01-01T00:00:00.000Z' })
    await expect(updateShareExpiry({ shareId, expiresAt: '2020-01-01T00:00:00.000Z' })).rejects.toThrow('future')
    await expect(updateShareExpiry({ shareId, expiresAt: null })).resolves.toMatchObject({ updated: true, expiresAt: null })
  })

  it('replaces the public code and token hash atomically, clears revocation, and returns the new URL once', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: shareId }, error: null })
    const builder = { update: vi.fn(() => builder), eq: vi.fn(() => builder), select: vi.fn(() => builder), maybeSingle }
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ from: vi.fn(() => builder) } as never)

    await expect(rotateShare(shareId)).resolves.toEqual({ shareCode: 'aB3xK9pQ2', shareUrl: 'https://code.thrn.im/view/aB3xK9pQ2' })
    expect(builder.update).toHaveBeenCalledWith({ share_code: 'aB3xK9pQ2', token_hash: 'new-token-hash', revoked_at: null })
  })

  it('retries rotation only when the new public code collides', async () => {
    vi.mocked(generateShareCode).mockReset().mockReturnValueOnce('dupCode01').mockReturnValueOnce('zY8wV7uT6')
    const maybeSingle = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: '23505', details: 'Key (share_code)=(dupCode01) already exists.' } })
      .mockResolvedValueOnce({ data: { id: shareId }, error: null })
    const builder = { update: vi.fn(() => builder), eq: vi.fn(() => builder), select: vi.fn(() => builder), maybeSingle }
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ from: vi.fn(() => builder) } as never)

    await expect(rotateShare(shareId)).resolves.toEqual({ shareCode: 'zY8wV7uT6', shareUrl: 'https://code.thrn.im/view/zY8wV7uT6' })
    expect(builder.update).toHaveBeenCalledTimes(2)
    expect(builder.update).toHaveBeenLastCalledWith({ share_code: 'zY8wV7uT6', token_hash: 'new-token-hash', revoked_at: null })
  })

  it('does not touch another workspace when resource authorization fails', async () => {
    vi.mocked(requireShareAccess).mockRejectedValue(new Error('forbidden'))
    const server = vi.mocked(createSupabaseServerClient)
    server.mockClear()

    await expect(revokeShare(shareId)).rejects.toThrow('forbidden')
    await expect(updateShareExpiry({ shareId, expiresAt: null })).rejects.toThrow('forbidden')
    await expect(rotateShare(shareId)).rejects.toThrow('forbidden')
    expect(server).not.toHaveBeenCalled()
  })
})
