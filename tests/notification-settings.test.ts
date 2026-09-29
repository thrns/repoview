import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { ensureNotificationDestination } from '../lib/notifications/settings'

function createClient(current: object | null, initialized: object | null) {
  const lookup = vi.fn().mockResolvedValue({ data: current, error: null })
  const insert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: initialized, error: null }) }),
  })
  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: initialized, error: null }) }),
  })
  const client = {
    from: vi.fn(() => ({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: lookup }) }), insert, update })),
  }
  return { client, lookup, insert, update }
}

describe('notification destination defaults', () => {
  it('creates a confirmed default for a confirmed authenticated user', async () => {
    const initialized = { destination_email: 'john@example.com', email_verified: true, view_opened: true, session_summary: false }
    const { client, insert } = createClient(null, initialized)

    await expect(ensureNotificationDestination(client as never, {
      workspaceId: 'workspace-1',
      accountEmail: 'John@Example.com',
      accountEmailConfirmed: true,
    })).resolves.toEqual(initialized)

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      workspace_id: 'workspace-1',
      destination_email: 'john@example.com',
      email_verified: true,
      view_opened: true,
    }))
  })

  it('initializes an existing null destination without replacing custom settings', async () => {
    const initialized = { destination_email: 'john@example.com', email_verified: true, view_opened: true, session_summary: false }
    const { client, update } = createClient({ destination_email: null, email_verified: false, view_opened: true, session_summary: false }, initialized)

    await expect(ensureNotificationDestination(client as never, {
      workspaceId: 'workspace-1',
      accountEmail: 'john@example.com',
      accountEmailConfirmed: true,
    })).resolves.toEqual(initialized)
    expect(update).toHaveBeenCalledWith({ destination_email: 'john@example.com', email_verified: true })

    const custom = { destination_email: 'custom@example.com', email_verified: true, view_opened: true, session_summary: false }
    const customClient = createClient(custom, null)
    await expect(ensureNotificationDestination(customClient.client as never, {
      workspaceId: 'workspace-1',
      accountEmail: 'john@example.com',
      accountEmailConfirmed: true,
    })).resolves.toEqual(custom)
    expect(customClient.update).not.toHaveBeenCalled()
  })

  it('does not mark an unconfirmed sign-in address as verified', async () => {
    const initialized = { destination_email: 'john@example.com', email_verified: false, view_opened: true, session_summary: false }
    const { client, insert } = createClient(null, initialized)

    await ensureNotificationDestination(client as never, {
      workspaceId: 'workspace-1',
      accountEmail: 'john@example.com',
      accountEmailConfirmed: false,
    })
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ email_verified: false }))
  })
})
