import 'server-only'

import { createSupabaseAdminClient } from '../supabase/admin'
import type { Json } from '../supabase/database.types'
import type { ViewerAnalyticsMode } from './privacy'

export type ViewerViewEventType = 'repository_opened' | 'file_opened' | 'file_viewed' | 'markdown_viewed' | 'directory_viewed' | 'directory_opened' | 'mermaid_viewed' | 'image_viewed' | 'raw_file_viewed' | 'search' | 'search_result_clicked' | 'code_selected' | 'copy' | 'download' | 'external_link_clicked' | 'scroll_depth' | 'tab_visibility_changed' | 'focus_changed' | 'session_ended' | 'view_confirmed' | 'link_opened'

const VIEW_EVENT_DEDUPE_WINDOW_MS = 10_000

export async function recordViewerViewEvent({
  shareId,
  sessionId,
  eventType,
  path,
  metadata = {},
  workspaceId,
  analyticsMode,
  gpcApplied,
  now = Date.now(),
}: {
  shareId: string
  sessionId: string
  eventType: ViewerViewEventType
  path: string | null
  metadata?: Record<string, Json>
  workspaceId: string
  analyticsMode?: ViewerAnalyticsMode
  gpcApplied?: boolean
  now?: number
}) {
  if (analyticsMode !== 'optional' || gpcApplied === true) {
    return { recorded: false, reason: 'necessary-only' as const }
  }

  const admin = createSupabaseAdminClient()
  const cutoff = new Date(now - VIEW_EVENT_DEDUPE_WINDOW_MS).toISOString()
  const recentEventQuery = admin
    .from('view_events')
    .select('id')
    .eq('share_id', shareId)
    .eq('session_id', sessionId)
    .eq('event_type', eventType)
    .eq('path', path as string)
    .gte('created_at', cutoff)
    .limit(1)
  const { data: recentEvent, error: lookupError } = await recentEventQuery.eq('workspace_id', workspaceId).maybeSingle()

  if (lookupError) {
    throw lookupError
  }
  if (recentEvent) {
    return { recorded: false }
  }

  const { error: insertError } = await admin.from('view_events').insert({
    workspace_id: workspaceId,
    share_id: shareId,
    session_id: sessionId,
    event_type: eventType,
    path,
    metadata,
  } as never)

  if (insertError) {
    throw insertError
  }

  return { recorded: true }
}
