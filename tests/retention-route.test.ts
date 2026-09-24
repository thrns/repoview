import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/env/server', () => ({ getServerEnv: vi.fn() }))
vi.mock('../lib/retention/cleanup', () => ({ runRetentionCleanup: vi.fn() }))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { GET } from '../app/api/cron/retention/route'
import { getServerEnv } from '../lib/env/server'
import { runRetentionCleanup } from '../lib/retention/cleanup'
import { createSupabaseAdminClient } from '../lib/supabase/admin'

const getEnv = vi.mocked(getServerEnv)
const runCleanup = vi.mocked(runRetentionCleanup)
const getAdmin = vi.mocked(createSupabaseAdminClient)

beforeEach(() => {
  vi.clearAllMocks()
  getEnv.mockReturnValue({ CRON_SECRET: 'c'.repeat(32) } as never)
  runCleanup.mockResolvedValue({
    referenceTime: '2026-09-24T12:00:00.000Z',
    cutoffs: {},
    processed: { repositoryViewEvents: 1 },
    totalProcessed: 1,
  })
  getAdmin.mockReturnValue(createAdminMock() as never)
})

describe('retention cron route', () => {
  it('rejects missing or incorrect credentials before opening the admin client', async () => {
    const missing = await GET(new Request('https://repoview.test/api/cron/retention'))
    const incorrect = await GET(new Request('https://repoview.test/api/cron/retention', { headers: { authorization: `Bearer ${'x'.repeat(32)}` } }))

    expect(missing.status).toBe(401)
    expect(incorrect.status).toBe(401)
    expect(getAdmin).not.toHaveBeenCalled()
    expect(runCleanup).not.toHaveBeenCalled()
  })

  it('records and runs an authorized bounded cleanup', async () => {
    const response = await GET(new Request('https://repoview.test/api/cron/retention', {
      headers: { authorization: `Bearer ${'c'.repeat(32)}` },
    }))

    expect(response.status).toBe(200)
    expect(runCleanup).toHaveBeenCalledWith(expect.objectContaining({ admin: expect.anything(), now: expect.any(Date) }))
    expect(await response.json()).toMatchObject({ ok: true, totalProcessed: 1 })
  })

  it('records failures without exposing implementation details', async () => {
    runCleanup.mockRejectedValue(new Error('database details must stay private'))

    const response = await GET(new Request('https://repoview.test/api/cron/retention', {
      headers: { authorization: `Bearer ${'c'.repeat(32)}` },
    }))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'unavailable' })
  })
})

function createAdminMock() {
  const update = vi.fn()
  const eq = vi.fn()
  const insert = vi.fn()
  const select = vi.fn()
  const single = vi.fn()
  const query: Record<string, unknown> = {
    update,
    eq,
    insert,
    select,
    single,
  }
  for (const method of ['update', 'eq', 'insert', 'select', 'single']) {
    query[method] = vi.fn(() => query)
  }
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve({ data: methodResult(query), error: null }).then(resolve, reject)
  return {
    from: vi.fn(() => query),
  }
}

function methodResult(query: Record<string, unknown>) {
  return query.insert ? { id: 'run-1' } : null
}
