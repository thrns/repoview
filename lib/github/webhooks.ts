import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

import { createSupabaseAdminClient } from '../supabase/admin'
import type { Tables, TablesUpdate } from '../supabase/database.types'

const repositoryPayloadSchema = z.object({
  id: z.number().int().positive(),
  node_id: z.string().min(1).max(200).optional(),
  name: z.string().min(1).max(200),
  owner: z.object({ login: z.string().min(1).max(100) }).optional(),
  full_name: z.string().max(300).optional(),
  default_branch: z.string().max(200).optional(),
}).passthrough()

const installationPayloadSchema = z.object({
  id: z.number().int().positive(),
  app_id: z.number().int().positive().optional(),
  account: z.object({
    id: z.number().int().positive(),
    login: z.string().min(1).max(100),
    type: z.enum(['User', 'Organization', 'Bot']),
  }).nullable().optional(),
  repository_selection: z.enum(['all', 'selected']).optional(),
  permissions: z.record(z.string(), z.string()).optional(),
  suspended_at: z.string().nullable().optional(),
}).passthrough()

const webhookPayloadSchema = z.object({
  action: z.string().max(100).default(''),
  installation: installationPayloadSchema.optional(),
  repository_selection: z.enum(['all', 'selected']).optional(),
  repositories_added: z.array(repositoryPayloadSchema).default([]),
  repositories_removed: z.array(repositoryPayloadSchema).default([]),
}).passthrough()

export type GitHubWebhookPayload = z.infer<typeof webhookPayloadSchema>
export type GitHubWebhookDeliveryResult = {
  status: 'processed' | 'ignored'
  duplicate?: boolean
  installationId: number | null
}

/**
 * Verify the exact raw request body GitHub signed. The length check is needed
 * before timingSafeEqual because Node requires equal-sized buffers.
 */
export function verifyGitHubWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
) {
  if (!signatureHeader || !secret) return false

  const match = /^sha256=([0-9a-f]{64})$/i.exec(signatureHeader.trim())
  if (!match) return false

  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest()
  const received = Buffer.from(match[1], 'hex')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export function parseGitHubWebhookPayload(rawBody: string): GitHubWebhookPayload {
  return webhookPayloadSchema.parse(JSON.parse(rawBody))
}

/**
 * Claim a delivery before dispatching it. A failed delivery may be claimed by
 * a later GitHub retry; processing/processed/ignored deliveries are treated as
 * duplicates. Every event handler below is idempotent as an additional guard.
 */
export async function processGitHubWebhookDelivery(input: {
  deliveryId: string
  event: string
  payload: GitHubWebhookPayload
}): Promise<GitHubWebhookDeliveryResult> {
  const deliveryId = normalizeDeliveryId(input.deliveryId)
  const event = normalizeHeaderValue(input.event, 100)
  const installationId = input.payload.installation?.id ?? null
  const action = input.payload.action
  const admin = createSupabaseAdminClient()
  const claim = await claimDelivery(admin, { deliveryId, event, action, installationId })

  if (!claim.claimed) {
    return {
      status: claim.status === 'processed' ? 'processed' : 'ignored',
      duplicate: true,
      installationId,
    }
  }

  try {
    const status = await dispatchWebhookEvent(admin, event, action, input.payload)
    await updateDelivery(admin, deliveryId, {
      status,
      processed_at: new Date().toISOString(),
      error: null,
    })
    return { status, installationId }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : 'GitHub webhook processing failed.'
    await updateDelivery(admin, deliveryId, {
      status: 'failed',
      processed_at: new Date().toISOString(),
      error: message,
    })
    throw error
  }
}

async function claimDelivery(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  input: { deliveryId: string; event: string; action: string; installationId: number | null },
) {
  const inserted = await admin
    .from('github_webhook_deliveries')
    .insert({
      delivery_id: input.deliveryId,
      event: input.event,
      action: input.action,
      installation_id: input.installationId,
      status: 'processing',
    })
    .select('status')
    .maybeSingle()

  if (inserted.data) return { claimed: true as const, status: 'processing' as const }

  const { data: existing, error: lookupError } = await admin
    .from('github_webhook_deliveries')
    .select('status')
    .eq('delivery_id', input.deliveryId)
    .maybeSingle()

  if (lookupError || !existing) {
    throw new Error('RepoView could not claim the GitHub webhook delivery.')
  }

  if (existing.status === 'failed') {
    const retried = await admin
      .from('github_webhook_deliveries')
      .update({ status: 'processing', processed_at: null, error: null })
      .eq('delivery_id', input.deliveryId)
      .eq('status', 'failed')
      .select('status')
      .maybeSingle()

    if (retried.data) return { claimed: true as const, status: 'processing' as const }
  }

  return { claimed: false as const, status: existing.status }
}

async function updateDelivery(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  deliveryId: string,
  update: TablesUpdate<'github_webhook_deliveries'>,
) {
  const { error } = await admin
    .from('github_webhook_deliveries')
    .update(update)
    .eq('delivery_id', deliveryId)

  if (error) throw new Error('RepoView could not update the GitHub webhook delivery.')
}

async function dispatchWebhookEvent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  event: string,
  action: string,
  payload: GitHubWebhookPayload,
): Promise<'processed' | 'ignored'> {
  if (event !== 'installation' && event !== 'installation_repositories') return 'ignored'

  const installationId = payload.installation?.id
  if (!installationId) return 'ignored'

  const { data: installation, error } = await admin
    .from('github_installations')
    .select('*')
    .eq('github_installation_id', installationId)
    .maybeSingle()

  if (error) throw new Error('RepoView could not resolve the GitHub App installation.')
  if (!installation) return 'ignored'

  if (event === 'installation') {
    switch (action) {
      case 'created':
        await updateInstallationFromPayload(admin, installation, payload.installation, 'active')
        await syncAddedRepositories(admin, installation, payload.repositories_added)
        return 'processed'
      case 'deleted':
        await updateInstallationFromPayload(admin, installation, payload.installation, 'deleted')
        await closeInstallationAccess(admin, installation)
        return 'processed'
      case 'suspended':
        await updateInstallationFromPayload(admin, installation, payload.installation, 'suspended')
        return 'processed'
      case 'unsuspended':
        await updateInstallationFromPayload(admin, installation, payload.installation, 'active')
        return 'processed'
      default:
        return 'ignored'
    }
  }

  const repositorySelection = payload.repository_selection ?? payload.installation?.repository_selection
  if (repositorySelection) {
    await updateInstallation(admin, installation.id, { repository_selection: repositorySelection })
  }

  switch (action) {
    case 'added':
      await syncAddedRepositories(admin, installation, payload.repositories_added)
      return 'processed'
    case 'removed':
      await closeRemovedRepositoryAccess(admin, installation, payload.repositories_removed)
      return 'processed'
    default:
      return 'ignored'
  }
}

async function updateInstallationFromPayload(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  installation: Tables<'github_installations'>,
  payload: GitHubWebhookPayload['installation'],
  status: Tables<'github_installations'>['status'],
) {
  const update: TablesUpdate<'github_installations'> = { status }
  if (payload?.account) {
    update.github_account_id = payload.account.id
    update.github_account_login = payload.account.login
    update.github_account_type = payload.account.type
  }
  if (payload?.repository_selection) update.repository_selection = payload.repository_selection
  if (payload?.permissions) update.permissions = payload.permissions
  update.suspended_at = status === 'suspended'
    ? payload?.suspended_at ?? new Date().toISOString()
    : null
  await updateInstallation(admin, installation.id, update)
}

async function updateInstallation(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  id: string,
  update: TablesUpdate<'github_installations'>,
) {
  const { error } = await admin
    .from('github_installations')
    .update(update)
    .eq('id', id)

  if (error) throw new Error('RepoView could not update the GitHub App installation.')
}

async function syncAddedRepositories(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  installation: Tables<'github_installations'>,
  repositories: GitHubWebhookPayload['repositories_added'],
) {
  for (const repository of repositories) {
    const { data: existing, error: lookupError } = await admin
      .from('repositories')
      .select('id')
      .eq('workspace_id', installation.workspace_id)
      .eq('github_repository_id', repository.id)
      .maybeSingle()

    if (lookupError) throw new Error('RepoView could not synchronize the added GitHub repository.')
    if (!existing) continue

    const update: TablesUpdate<'repositories'> = {
      github_installation_id: installation.id,
      github_repository_id: repository.id,
      ...(repository.node_id ? { github_node_id: repository.node_id } : {}),
      ...(repository.owner?.login ? { github_owner: repository.owner.login } : {}),
      ...(repository.name ? { github_repo: repository.name } : {}),
      ...(repository.default_branch ? { default_branch: repository.default_branch } : {}),
    }
    const { error } = await admin
      .from('repositories')
      .update(update)
      .eq('id', existing.id)
      .eq('workspace_id', installation.workspace_id)

    if (error) throw new Error('RepoView could not synchronize the added GitHub repository.')
  }
}

async function closeInstallationAccess(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  installation: Tables<'github_installations'>,
) {
  const { data: repositories, error: repositoryLookupError } = await admin
    .from('repositories')
    .select('id')
    .eq('workspace_id', installation.workspace_id)
    .eq('github_installation_id', installation.id)

  if (repositoryLookupError) throw new Error('RepoView could not close the GitHub installation repositories.')
  await closeRepositoryAccess(admin, installation.workspace_id, (repositories ?? []).map((repository) => repository.id))
}

async function closeRemovedRepositoryAccess(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  installation: Tables<'github_installations'>,
  repositories: GitHubWebhookPayload['repositories_removed'],
) {
  if (repositories.length === 0) return

  const repositoryIds = repositories.map((repository) => repository.id)
  const { data: localRepositories, error: repositoryLookupError } = await admin
    .from('repositories')
    .select('id')
    .eq('workspace_id', installation.workspace_id)
    .eq('github_installation_id', installation.id)
    .in('github_repository_id', repositoryIds)

  if (repositoryLookupError) throw new Error('RepoView could not resolve removed GitHub repositories.')
  await closeRepositoryAccess(admin, installation.workspace_id, (localRepositories ?? []).map((repository) => repository.id))
}

async function closeRepositoryAccess(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  workspaceId: string,
  repositoryIds: string[],
) {
  if (repositoryIds.length === 0) return

  const { error: repositoryError } = await admin
    .from('repositories')
    .update({ enabled: false })
    .eq('workspace_id', workspaceId)
    .in('id', repositoryIds)

  if (repositoryError) throw new Error('RepoView could not disable GitHub repository access.')

  const { error: shareError } = await admin
    .from('shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .in('repository_id', repositoryIds)
    .is('revoked_at', null)

  if (shareError) throw new Error('RepoView could not revoke GitHub repository shares.')
}

function normalizeDeliveryId(value: string) {
  return normalizeHeaderValue(value, 200)
}

function normalizeHeaderValue(value: string, maxLength: number) {
  const normalized = value.trim()
  if (!normalized || normalized.length > maxLength) {
    throw new Error('The GitHub webhook header is invalid.')
  }
  return normalized
}
