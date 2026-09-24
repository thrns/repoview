import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { getOnboardingState } from '../lib/auth/onboarding'
import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { createSupabaseServerClient } from '../lib/supabase/server'

const getServer = vi.mocked(createSupabaseServerClient)
const getAdmin = vi.mocked(createSupabaseAdminClient)
const user = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'ada@example.com',
  email_confirmed_at: '2026-09-24T00:00:00.000Z',
  app_metadata: { provider: 'email' },
  identities: [],
}
const workspace = { id: '11111111-1111-4111-8111-111111111111', name: 'Ada Workspace', owner_id: user.id }
const membership = { workspace_id: workspace.id, user_id: user.id, role: 'owner' }
const completedProfile = {
  id: user.id,
  full_name: 'Ada Lovelace',
  profile_completed_at: '2026-09-24T00:00:00.000Z',
  terms_version_accepted: '2026-09-23',
  privacy_version_acknowledged: '2026-09-23',
  onboarding_completed_at: null,
}

function queryResult(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data, error })),
  }
  return query
}

type StateFixtures = {
  profile?: Record<string, unknown>
  installations?: unknown[]
  repositories?: unknown[]
  shares?: unknown[]
  pending?: unknown[]
}

function configureState({ profile = completedProfile, installations = [], repositories = [], shares = [], pending = [] }: StateFixtures = {}) {
  const server = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from(table: string) {
      if (table === 'profiles') return queryResult(profile)
      if (table === 'workspace_members') return queryResult(membership)
      if (table === 'workspaces') return queryResult(workspace)
      if (table === 'github_installations') return queryResult(installations)
      if (table === 'repositories') return queryResult(repositories)
      if (table === 'shares') return queryResult(shares)
      throw new Error(`Unexpected table ${table}`)
    },
  }
  const admin = {
    from(table: string) {
      if (table !== 'github_connection_transactions') throw new Error(`Unexpected table ${table}`)
      return queryResult(pending)
    },
  }
  getServer.mockResolvedValue(server as never)
  getAdmin.mockReturnValue(admin as never)
}

beforeEach(() => vi.clearAllMocks())

describe('onboarding state', () => {
  it('starts new verified accounts at the profile checkpoint', async () => {
    configureState({ profile: { ...completedProfile, profile_completed_at: null, terms_version_accepted: null, privacy_version_acknowledged: null } })
    await expect(getOnboardingState()).resolves.toMatchObject({ step: 'profile', isComplete: false })
  })

  it('keeps organization approval resumable without granting repository access', async () => {
    configureState({ installations: [], pending: [{ id: 'connection-1' }] })
    await expect(getOnboardingState()).resolves.toMatchObject({ step: 'github', hasPendingGitHubConnection: true, enabledRepositoryCount: 0 })
  })

  it('advances from repository selection to first share and then complete', async () => {
    configureState({ installations: [{ status: 'active' }], repositories: [{ id: 'repo-1', enabled: true }], shares: [] })
    await expect(getOnboardingState()).resolves.toMatchObject({ step: 'share', enabledRepositoryCount: 1 })

    configureState({ installations: [{ status: 'active' }], repositories: [{ id: 'repo-1', enabled: true }], shares: [{ id: 'share-1' }] })
    await expect(getOnboardingState()).resolves.toMatchObject({ step: 'complete', isComplete: true })
  })
})
