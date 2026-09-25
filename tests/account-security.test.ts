import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/account/deletion', () => ({
  AccountDeletionError: class AccountDeletionError extends Error {},
  deleteAccountData: vi.fn(),
}))
vi.mock('@/lib/account/deletion-shared', () => ({ getAccountDeletionConfirmation: vi.fn(() => 'DELETE owner@example.com') }))
vi.mock('@/lib/account/step-up', () => ({
  consumeStepUpConfirmation: vi.fn(),
  issueStepUpConfirmation: vi.fn(),
  StepUpConfirmationUnavailableError: class StepUpConfirmationUnavailableError extends Error {},
}))
vi.mock('@/lib/security/origin', () => ({ isAllowedRequestOrigin: vi.fn(() => true) }))
vi.mock('@/lib/security/rate-limit', () => ({
  checkPublicRateLimit: vi.fn(async () => null),
  checkRateLimits: vi.fn(async () => null),
  rateLimitResponse: vi.fn(() => new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 })),
  rateLimitUnavailableResponse: vi.fn(() => new Response(JSON.stringify({ error: 'rate_limit_unavailable' }), { status: 503 })),
}))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn(() => ({ from: vi.fn() })) }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('@/lib/audit-log', () => ({
  AUDIT_ACTIONS: { accountExportRequested: 'account_export_requested', accountExportSucceeded: 'account_export_succeeded', accountExportFailed: 'account_export_failed' },
  recordAuditLogBestEffort: vi.fn(async () => true),
}))

import { POST as deleteAccount } from '../app/api/account/delete/route'
import { POST as reauthenticate } from '../app/api/account/reauthenticate/route'
import { GET as exportAccount } from '../app/api/account/export/route'
import { deleteAccountData } from '@/lib/account/deletion'
import { consumeStepUpConfirmation, issueStepUpConfirmation } from '@/lib/account/step-up'
import { isAllowedRequestOrigin } from '@/lib/security/origin'
import { checkPublicRateLimit, checkRateLimits } from '@/lib/security/rate-limit'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const getServerClient = vi.mocked(createSupabaseServerClient)
const consumeStepUp = vi.mocked(consumeStepUpConfirmation)
const issueStepUp = vi.mocked(issueStepUpConfirmation)
const getOrigin = vi.mocked(isAllowedRequestOrigin)
const deleteData = vi.mocked(deleteAccountData)
const publicRateLimit = vi.mocked(checkPublicRateLimit)
const accountExportRateLimit = vi.mocked(checkRateLimits)

beforeEach(() => {
  vi.clearAllMocks()
  getOrigin.mockReturnValue(true)
  consumeStepUp.mockResolvedValue(false)
  issueStepUp.mockResolvedValue({ expiresAt: '2026-09-24T12:05:00.000Z' })
  publicRateLimit.mockResolvedValue(null)
  accountExportRateLimit.mockResolvedValue(null)
  getServerClient.mockReturnValue(createServerClientMock() as never)
})

describe('account deletion security', () => {
  it('does not allow a stolen old session or last_sign_in_at alone to delete an account', async () => {
    const response = await deleteAccount(new Request('http://localhost:3000/api/account/delete', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE owner@example.com' }),
    }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'recent_auth_required' })
    expect(deleteData).not.toHaveBeenCalled()
  })

  it('rejects a cross-origin destructive request before authentication or cleanup', async () => {
    getOrigin.mockReturnValue(false)

    const response = await deleteAccount(new Request('http://localhost:3000/api/account/delete', {
      method: 'POST',
      headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE owner@example.com' }),
    }))

    expect(response.status).toBe(403)
    expect(deleteData).not.toHaveBeenCalled()
  })

  it('queues deletion and signs out after fail-closed provisioning succeeds', async () => {
    consumeStepUp.mockResolvedValue(true)
    deleteData.mockResolvedValue({ queued: true, jobId: 'job-1', status: 'queued' })
    const client = createServerClientMock()
    getServerClient.mockReturnValue(client as never)

    const response = await deleteAccount(new Request('http://localhost:3000/api/account/delete', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE owner@example.com' }),
    }))

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({ queued: true, jobId: 'job-1' })
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
})

describe('account step-up authentication', () => {
  it('issues a short-lived confirmation after successful password reauthentication', async () => {
    const response = await reauthenticate(new Request('http://localhost:3000/api/account/reauthenticate', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({ operation: 'account-delete', password: 'correct-password' }),
    }))

    expect(response.status).toBe(200)
    expect(issueStepUp).toHaveBeenCalledWith(expect.objectContaining({ operation: 'account-delete', assuranceLevel: 'aal1', method: 'password' }))
  })

  it('requires MFA assurance when the account has a verified factor', async () => {
    const client = createServerClientMock()
    client.auth.mfa.listFactors.mockResolvedValue({ data: { all: [{ id: 'factor-1', status: 'verified' }] }, error: null })
    getServerClient.mockReturnValue(client as never)

    const response = await reauthenticate(new Request('http://localhost:3000/api/account/reauthenticate', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
      body: JSON.stringify({ operation: 'account-export', password: 'correct-password' }),
    }))

    expect(response.status).toBe(428)
    expect(issueStepUp).not.toHaveBeenCalled()
  })
})

describe('account export security', () => {
  it('stops before export construction when the user/workspace bucket is throttled', async () => {
    accountExportRateLimit.mockResolvedValue({ allowed: false, limit: 3, remaining: 0, retryAfterSeconds: 60, resetAt: '2026-09-24T12:01:00.000Z' })

    const response = await exportAccount()

    expect(response.status).toBe(429)
    expect(consumeStepUp).not.toHaveBeenCalled()
  })
})

function createServerClientMock() {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [{ workspace_id: 'workspace-1', role: 'owner', created_at: '2026-09-24T00:00:00.000Z', updated_at: '2026-09-24T00:00:00.000Z' }], error: null }).then(resolve),
  }
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'owner@example.com', last_sign_in_at: '2020-01-01T00:00:00.000Z' } }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      mfa: {
        listFactors: vi.fn().mockResolvedValue({ data: { all: [] }, error: null }),
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({ data: { currentLevel: 'aal1' }, error: null }),
        challengeAndVerify: vi.fn(),
      },
    },
    from: vi.fn(() => query),
  }
}
