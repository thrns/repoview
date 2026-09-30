'use server'

import { z } from 'zod'

import { requireRepositoryAccess, requireWorkspaceRole } from '../../../../../lib/auth/workspace'
import { getPublicEnv } from '../../../../../lib/env/public'
import { getRepositoryRef } from '../../../../../lib/github/repositories'
import { parseVisibilityRules } from '../../../../../lib/security/visibility'
import { generateShareCode, hashShareToken } from '../../../../../lib/security/tokens'
import { createSupabaseAdminClient } from '../../../../../lib/supabase/admin'
import { listRegisteredRepositories } from '../../../../../lib/repositories/registry'
import { synchronizeRepositoryForGitHub } from '../../../../../lib/repositories/synchronize'
import { SHARE_CODE_MAX_ATTEMPTS, isShareCodeUniqueViolation } from '../../../../../lib/shares/share-code'
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
    const admin = createSupabaseAdminClient()
    let data: { id: string; share_code: string } | null = null
    let generatedShareCode: string | null = null

    for (let attempt = 0; attempt < SHARE_CODE_MAX_ATTEMPTS; attempt += 1) {
      const candidate = generateShareCode()
      const tokenHash = hashShareToken(candidate)
      const candidateReservation = await reserveResourceQuota(
        'active-shares',
        repositoryAccess.workspace.id,
        `share:${tokenHash}`,
      )
      const createRecipient = parsed.shareType === 'recipient'
        || Boolean(parsed.recipientName || parsed.company || parsed.email || parsed.roleNotes)
      let inserted
      try {
        inserted = await admin.rpc('create_share_with_recipient', {
          target_workspace_id: repositoryAccess.workspace.id,
          target_repository_id: repository.id,
          target_share_code: candidate,
          target_share_type: parsed.shareType,
          target_token_hash: tokenHash,
          target_recipient_label: recipientLabel,
          target_commit_sha: repositoryRef.sha,
          target_ref: repositoryRef.name,
          target_expires_at: parsed.expiresAt,
          target_notify_on_view: parsed.notifyOnView,
          target_allow_download: parsed.allowDownload,
          target_rules: {
            hidden: [...rules.hidden],
            allowOnly: [...rules.allowOnly],
          },
          target_note: parsed.note || null,
          target_created_by: repositoryAccess.user.id,
          target_create_recipient: createRecipient,
          target_recipient_name: parsed.recipientName || null,
          target_company: parsed.company || null,
          target_email: parsed.email || null,
          target_role_notes: parsed.roleNotes || null,
        })
      } catch (error) {
        if (candidateReservation.owned) {
          try {
            await releaseResourceQuota(candidateReservation)
          } catch {
            // The short reservation lease safely expires if cleanup is unavailable.
          }
        }
        throw error
      }

      const created = inserted.data?.[0]
      if (!inserted.error && created) {
        resourceReservation = candidateReservation
        data = created
        generatedShareCode = created.share_code
        break
      }

      if (candidateReservation.owned) {
        try {
          await releaseResourceQuota(candidateReservation)
        } catch {
          // The short reservation lease safely expires if cleanup is unavailable.
        }
      }

      if (!isShareCodeUniqueViolation(inserted.error) || attempt === SHARE_CODE_MAX_ATTEMPTS - 1) {
        throw inserted.error ?? new Error('RepoView could not create this share.')
      }
    }

    if (!data || !generatedShareCode || !resourceReservation) {
      throw new Error('RepoView could not allocate a share code.')
    }
    shareCreated = true
    if (resourceReservation) {
      try {
        await finalizeResourceQuota(resourceReservation)
      } catch {
        // The share is durable; the short reservation lease safely expires.
      }
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
      shareUrl: `${appUrl}/view/${data.share_code}`,
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
