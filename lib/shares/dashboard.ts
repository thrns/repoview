import 'server-only'

import { requireWorkspace } from '../auth/workspace'
import { createSupabaseServerClient } from '../supabase/server'
import type { Tables } from '../supabase/database.types'

export type ShareStatus = 'active' | 'expiring-soon' | 'expired' | 'revoked' | 'repository-disabled'

export interface ShareDashboardItem {
  share: Tables<'shares'>
  repository: Tables<'repositories'> | null
  status: ShareStatus
  confirmedViews: number
  lastViewedAt: string | null
}

export async function listShareDashboardItems(now = new Date()): Promise<ShareDashboardItem[]> {
  const { workspace } = await requireWorkspace()
  const supabase = await createSupabaseServerClient()
  const { data: shares, error: sharesError } = await supabase
    .from('shares')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })

  if (sharesError) {
    throw new Error('RepoView shares could not be loaded.')
  }

  const shareRows = shares ?? []
  if (shareRows.length === 0) {
    return []
  }

  const shareIds = shareRows.map((share) => share.id)
  const repositoryIds = [...new Set(shareRows.map((share) => share.repository_id))]
  const [{ data: repositories, error: repositoriesError }, { data: sessions, error: sessionsError }] = await Promise.all([
    supabase.from('repositories').select('*').eq('workspace_id', workspace.id).in('id', repositoryIds),
    supabase.from('viewer_sessions').select('share_id, confirmed_at, last_seen_at').eq('workspace_id', workspace.id).in('share_id', shareIds),
  ])

  if (repositoriesError || sessionsError) {
    throw new Error('RepoView share activity could not be loaded.')
  }

  const repositoriesById = new Map((repositories ?? []).map((repository) => [repository.id, repository]))
  const sessionsByShare = new Map<string, Array<{ confirmed_at: string | null; last_seen_at: string }>>()
  for (const session of sessions ?? []) {
    const shareSessions = sessionsByShare.get(session.share_id) ?? []
    shareSessions.push(session)
    sessionsByShare.set(session.share_id, shareSessions)
  }

  return shareRows.map((share) => {
    const shareSessions = sessionsByShare.get(share.id) ?? []
    const confirmedSessions = shareSessions.filter((session) => session.confirmed_at !== null)
    const lastViewedAt = confirmedSessions.reduce<string | null>((latest, session) => {
      if (!latest || new Date(session.last_seen_at).getTime() > new Date(latest).getTime()) {
        return session.last_seen_at
      }
      return latest
    }, null)
    const repository = repositoriesById.get(share.repository_id) ?? null

    return {
      share,
      repository,
      status: getShareStatus(share, repository, now),
      confirmedViews: confirmedSessions.length,
      lastViewedAt,
    }
  })
}

export function getShareStatus(share: Tables<'shares'>, repository: Tables<'repositories'> | null, now = new Date()): ShareStatus {
  if (share.revoked_at) {
    return 'revoked'
  }
  if (!repository?.enabled) {
    return 'repository-disabled'
  }
  if (share.expires_at) {
    const expiry = new Date(share.expires_at).getTime()
    if (expiry <= now.getTime()) {
      return 'expired'
    }
    if (expiry <= now.getTime() + 7 * 24 * 60 * 60 * 1000) {
      return 'expiring-soon'
    }
  }
  return 'active'
}
