'use server'

import { z } from 'zod'

import { requireRepositoryAccess, requireWorkspaceRole } from '@/lib/auth/workspace'
import { getPublicEnv } from '@/lib/env/public'
import { getRepositoryRef } from '@/lib/github/repositories'
import { parseVisibilityRules } from '@/lib/security/visibility'
import { generateShareCode, generateShareToken, hashShareToken } from '@/lib/security/tokens'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { listRegisteredRepositories } from '@/lib/repositories/registry'
import { synchronizeRepositoryForGitHub } from '@/lib/repositories/synchronize'
import { enforceAuthenticatedRateLimit } from '../../../../../lib/security/rate-limit'
import { finalizeResourceQuota, releaseQuota, releaseResourceQuota, reserveQuota, reserveResourceQuota, type ResourceQuotaReservation } from '../../../../../lib/security/quotas'
import { AUDIT_ACTIONS, recordAuditLogBestEffort } from '../../../../../lib/audit-log'

const shareFormInputSchema = z.object({
  repositoryId: z.string().uuid(),
  shareType: z.enum(['generic', 'recipient']).default('recipient'),
  recipientLabel: z.string().trim().max(200).default(''),
  recipientName: z.string().trim().max(200).default(''),
  company: z.string().trim().max(200).default(''),
  email: z.string().trim().email().max(320).or(z.literal('')).default(''),
  roleNotes: z.string().trim().max(2000).default(''),
  ref: z.string().trim().min(1).max(256),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
  notifyOnView: z.boolean(),
  allowDownload: z.boolean(),
  note: z.string().trim().max(2000),
  hidden: z.array(z.unknown()),
  allowOnly: z.array(z.unknown()),
})

export async function validateShareForm(input: unknown) {
  const parsed = shareFormInputSchema.parse(input)
  const repositoryAccess = await requireRepositoryAccess(parsed.repositoryId)
  await requireWorkspaceRole(repositoryAccess.workspace.id, ['owner', 'admin'])
  await enforceAuthenticatedRateLimit('authenticated-share-create', repositoryAccess.workspace.id, repositoryAccess.user.id)
  const repositories = await listRegisteredRepositories()
  const storedRepository = repositories.find((candidate) => candidate.id === parsed.repositoryId)

  if (!storedRepository || !storedRepository.enabled) {
    throw new Error('Choose an enabled repository before creating a share.')
  }
  if (storedRepository.workspace_id !== repositoryAccess.workspace.id) {
    throw new Error('That repository is not available in the active workspace.')
  }

  if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
    throw new Error('Expiry must be in the future.')
  }

  const { repository } = await synchronizeRepositoryForGitHub(storedRepository.id, repositoryAccess.workspace.id, 'member')
  if (!repository.enabled) throw new Error('Choose an enabled repository before creating a share.')
  const repositoryRef = await getRepositoryRef(repository.github_owner, repository.github_repo, parsed.ref, repository.github_installation_id, repositoryAccess.workspace.id, 'member')
  const rules = parseVisibilityRules({ hidden: parsed.hidden, allowOnly: parsed.allowOnly })
  const recipientLabel = parsed.recipientName || parsed.recipientLabel || parsed.company || ''

  return {
    valid: true as const,
    repositoryId: repository.id,
    repository: `${repository.github_owner}/${repository.github_repo}`,
    ref: repositoryRef.name,
    shareType: parsed.shareType,
    recipientLabel,
    commitSha: repositoryRef.sha,
    recipientName: parsed.recipientName,
    company: parsed.company,
    email: parsed.email,
    roleNotes: parsed.roleNotes,
    expiresAt: parsed.expiresAt,
    notifyOnView: parsed.notifyOnView,
    allowDownload: parsed.allowDownload,
    note: parsed.note,
    rules,
  }
}

export async function createShare(input: unknown) {
  const parsed = shareFormInputSchema.parse(input)
  const repositoryAccess = await requireRepositoryAccess(parsed.repositoryId)
  await requireWorkspaceRole(repositoryAccess.workspace.id, ['owner', 'admin'])
  await enforceAuthenticatedRateLimit('authenticated-share-create', repositoryAccess.workspace.id, repositoryAccess.user.id)
  const repositories = await listRegisteredRepositories()
  const storedRepository = repositories.find((candidate) => candidate.id === parsed.repositoryId)

  if (!storedRepository || !storedRepository.enabled) {
    throw new Error('Choose an enabled repository before creating a share.')
  }
  if (storedRepository.workspace_id !== repositoryAccess.workspace.id) {
    throw new Error('That repository is not available in the active workspace.')
  }

  if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
    throw new Error('Expiry must be in the future.')
  }

  const dailyShareReservation = await reserveQuota('shares-created-daily', repositoryAccess.workspace.id, 'workspace')

  let shareCreated = false
  let resourceReservation: ResourceQuotaReservation | null = null
  try {
    const { repository } = await synchronizeRepositoryForGitHub(storedRepository.id, repositoryAccess.workspace.id, 'member')
    if (!repository.enabled) throw new Error('Choose an enabled repository before creating a share.')
    const repositoryRef = await getRepositoryRef(repository.github_owner, repository.github_repo, parsed.ref, repository.github_installation_id, repositoryAccess.workspace.id, 'member')
    const rules = parseVisibilityRules({ hidden: parsed.hidden, allowOnly: parsed.allowOnly })
    const recipientLabel = parsed.recipientName || parsed.recipientLabel || parsed.company || null
    const rawToken = generateShareToken()
    resourceReservation = await reserveResourceQuota(
      'active-shares',
      repositoryAccess.workspace.id,
      `share:${hashShareToken(rawToken)}`,
    )
    const shareCode = generateShareCode()
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('shares')
      .insert({
        repository_id: repository.id,
        share_code: shareCode,
        share_type: parsed.shareType,
        token_hash: hashShareToken(rawToken),
        recipient_label: recipientLabel,
        commit_sha: repositoryRef.sha,
        ref: repositoryRef.name,
        expires_at: parsed.expiresAt,
        notify_on_view: parsed.notifyOnView,
        allow_download: parsed.allowDownload,
        rules: {
          hidden: [...rules.hidden],
          allowOnly: [...rules.allowOnly],
        },
        note: parsed.note || null,
        workspace_id: repositoryAccess.workspace.id,
        created_by: repositoryAccess.user.id,
      })
      .select('id, share_code')
      .single()

    if (error || !data) {
      throw new Error('RepoView could not create this share.')
    }
    shareCreated = true
    if (resourceReservation) {
      try {
        await finalizeResourceQuota(resourceReservation)
      } catch {
        // The share is durable; the short reservation lease safely expires.
      }
    }

    if (parsed.shareType === 'recipient' || parsed.recipientName || parsed.company || parsed.email || parsed.roleNotes) {
      const { error: recipientError } = await supabase.from('share_recipients').insert({
        workspace_id: repositoryAccess.workspace.id,
        share_id: data.id,
        recipient_name: parsed.recipientName || null,
        company: parsed.company || null,
        email: parsed.email || null,
        role_notes: parsed.roleNotes || null,
      })
      if (recipientError) throw new Error('RepoView could not save recipient details.')
    }

    await recordAuditLogBestEffort({
      workspaceId: repositoryAccess.workspace.id,
      actorUserId: repositoryAccess.user.id,
      action: AUDIT_ACTIONS.shareCreated,
      resourceType: 'share',
      resourceId: data.id,
      metadata: {
        repository: `${repository.github_owner}/${repository.github_repo}`,
        share_type: parsed.shareType,
        expires_at: parsed.expiresAt,
      },
    })

    const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    return {
      shareId: data.id,
      shareCode: data.share_code,
      shareUrl: `${appUrl}/s/${rawToken}`,
      repository: `${repository.github_owner}/${repository.github_repo}`,
      ref: repositoryRef.name,
    }
  } catch (error) {
    if (!shareCreated) await releaseQuota(dailyShareReservation)
    if (!shareCreated && resourceReservation) {
      try {
        await releaseResourceQuota(resourceReservation)
      } catch {
        // The short reservation lease bounds recovery if cleanup is unavailable.
      }
    }
    throw error
  }
}
