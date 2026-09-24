import { createHmac } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

import { createSupabaseAdminClient } from '../lib/supabase/admin'
import {
  processGitHubWebhookDelivery,
  verifyGitHubWebhookSignature,
} from '../lib/github/webhooks'

const getAdmin = vi.mocked(createSupabaseAdminClient)
const secret = 'webhook-secret'.repeat(3)
const installation = {
  id: 'installation-record-1',
  workspace_id: 'workspace-1',
  github_installation_id: 777,
  github_account_id: 42,
  github_account_login: 'octocat',
  github_account_type: 'User' as const,
  repository_selection: 'selected' as const,
  permissions: { contents: 'read' },
  status: 'active' as const,
  suspended_at: null,
  created_at: '2026-09-24T00:00:00.000Z',
  updated_at: '2026-09-24T00:00:00.000Z',
}

beforeEach(() => {
  getAdmin.mockReset()
})

describe('GitHub webhook security', () => {
  it('accepts a valid raw-body HMAC-SHA256 signature', () => {
    const body = '{"action":"ping","installation":{"id":777}}'
    const signature = `sha256=${createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`

    expect(verifyGitHubWebhookSignature(body, signature, secret)).toBe(true)
  })

  it('rejects an invalid signature before payload processing', () => {
    const body = '{"action":"installation.deleted","installation":{"id":777}}'

    expect(verifyGitHubWebhookSignature(body, 'sha256=invalid', secret)).toBe(false)
    expect(verifyGitHubWebhookSignature(body, null, secret)).toBe(false)
  })

  it('does not process the same delivery twice', async () => {
    const deliveries = new Map<string, { status: string }>()
    const deliveriesTable = createDeliveryTable(deliveries)
    getAdmin.mockReturnValue({
      from(table: string) {
        if (table !== 'github_webhook_deliveries') throw new Error(`Unexpected table ${table}`)
        return deliveriesTable
      },
    } as never)

    const input = {
      deliveryId: 'delivery-duplicate',
      event: 'ping',
      payload: { action: 'ping', repositories_added: [], repositories_removed: [] },
    }

    await expect(processGitHubWebhookDelivery(input)).resolves.toMatchObject({ status: 'ignored' })
    await expect(processGitHubWebhookDelivery(input)).resolves.toMatchObject({ status: 'ignored', duplicate: true })
    expect(deliveriesTable.insert).toHaveBeenCalledTimes(2)
  })
})

describe('GitHub webhook access transitions', () => {
  it('disconnects an installation and closes its repositories and active shares', async () => {
    const repositoryRows = [{ id: 'repository-1' }, { id: 'repository-2' }]
    const { admin, installationUpdate, repositoryUpdate, shareUpdate } = createEventAdmin({
      installation,
      repositoryRows,
    })
    getAdmin.mockReturnValue(admin as never)

    await expect(processGitHubWebhookDelivery({
      deliveryId: 'delivery-deleted',
      event: 'installation',
      payload: {
        action: 'deleted',
        installation: { id: 777 },
        repositories_added: [],
        repositories_removed: [],
      },
    })).resolves.toMatchObject({ status: 'processed', installationId: 777 })

    expect(installationUpdate).toHaveBeenCalledWith({ status: 'deleted', suspended_at: null })
    expect(repositoryUpdate).toHaveBeenCalledWith({ enabled: false })
    expect(shareUpdate).toHaveBeenCalledWith({ revoked_at: expect.any(String) })
  })

  it('removes repository access and revokes its active shares', async () => {
    const { admin, repositorySelect, repositoryUpdate, shareUpdate } = createEventAdmin({
      installation,
      repositoryRows: [{ id: 'repository-1' }],
    })
    getAdmin.mockReturnValue(admin as never)

    await expect(processGitHubWebhookDelivery({
      deliveryId: 'delivery-removed',
      event: 'installation_repositories',
      payload: {
        action: 'removed',
        installation: { id: 777 },
        repositories_added: [],
        repositories_removed: [{ id: 9001, name: 'private-repo' }],
      },
    })).resolves.toMatchObject({ status: 'processed', installationId: 777 })

    expect(repositorySelect.in).toHaveBeenCalledWith('github_repository_id', [9001])
    expect(repositoryUpdate).toHaveBeenCalledWith({ enabled: false })
    expect(shareUpdate).toHaveBeenCalledWith({ revoked_at: expect.any(String) })
  })
})

function createDeliveryTable(deliveries: Map<string, { status: string }>) {
  const insert = vi.fn((row: { delivery_id: string; status: string }) => {
    const duplicate = deliveries.has(row.delivery_id)
    if (!duplicate) deliveries.set(row.delivery_id, { status: row.status })
    return {
      select: () => ({
        maybeSingle: async () => duplicate
          ? { data: null, error: { code: '23505' } }
          : { data: { status: row.status }, error: null },
      }),
    }
  })
  const select = vi.fn(() => createQuery(async () => ({
    data: deliveries.get('delivery-duplicate') ?? null,
    error: null,
  })))
  const update = vi.fn((values: { status?: string }) => createQuery(async () => {
    if (values.status) deliveries.set('delivery-duplicate', { status: values.status })
    return { data: null, error: null }
  }))

  return { insert, select, update }
}

function createEventAdmin(input: { installation: typeof installation; repositoryRows: Array<{ id: string }> }) {
  const installationSelect = createQuery(async () => ({ data: input.installation, error: null }))
  const installationUpdate = vi.fn()
  const installationUpdateQuery = createQuery(async () => ({ data: null, error: null }))
  installationUpdate.mockReturnValue(installationUpdateQuery)

  const repositorySelect = createQuery(async () => ({ data: input.repositoryRows, error: null }))
  const repositoryUpdate = vi.fn()
  const repositoryUpdateQuery = createQuery(async () => ({ data: null, error: null }))
  repositoryUpdate.mockReturnValue(repositoryUpdateQuery)

  const shareUpdate = vi.fn()
  const shareUpdateQuery = createQuery(async () => ({ data: null, error: null }))
  shareUpdate.mockReturnValue(shareUpdateQuery)

  const deliveries = new Map<string, { status: string }>()
  const deliveriesTable = createDeliveryTable(deliveries)
  const admin = {
    from(table: string) {
      switch (table) {
        case 'github_webhook_deliveries':
          return deliveriesTable
        case 'github_installations':
          return { select: vi.fn(() => installationSelect), update: installationUpdate }
        case 'repositories':
          return { select: vi.fn(() => repositorySelect), update: repositoryUpdate }
        case 'shares':
          return { update: shareUpdate }
        default:
          throw new Error(`Unexpected table ${table}`)
      }
    },
  }

  return {
    admin,
    installationUpdate,
    repositorySelect,
    repositoryUpdate,
    shareUpdate,
  }
}

function createQuery(resolve: () => Promise<unknown>) {
  const query: Record<string, unknown> = {}
  for (const method of ['eq', 'in', 'is', 'select']) {
    query[method] = vi.fn(() => query)
  }
  query.maybeSingle = vi.fn(resolve)
  query.then = (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
    resolve().then(onFulfilled, onRejected)
  return query as MockQuery
}

type MockQuery = {
  eq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  is: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => Promise<unknown>
}
