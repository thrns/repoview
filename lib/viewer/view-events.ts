import 'server-only'

import { createSupabaseAdminClient } from '../supabase/admin'
import type { Json } from '../supabase/database.types'

export type ViewerViewEventType = 'repository_opened' | 'file_opened' | 'file_viewed' | 'markdown_viewed' | 'directory_viewed' | 'directory_opened' | 'mermaid_viewed' | 'image_viewed' | 'raw_file_viewed' | 'search' | 'search_result_clicked' | 'code_selected' | 'copy' | 'download' | 'external_link_clicked' | 'scroll_depth' | 'tab_visibility_changed' | 'focus_changed' | 'session_ended' | 'view_confirmed' | 'link_opened'

const VIEW_EVENT_DEDUPE_WINDOW_MS = 10_000

export async function recordViewerViewEvent({
  shareId,
  sessionId,
  eventType,
  path,
  metadata = {},
  now = Date.now(),
}: {
  shareId: string
  sessionId: string
  eventType: ViewerViewEventType
  path: string | null
  metadata?: Record<string, Json>
  now?: number
}) {
  const admin = createSupabaseAdminClient()
  const cutoff = new Date(now - VIEW_EVENT_DEDUPE_WINDOW_MS).toISOString()
  const { data: recentEvent, error: lookupError } = await admin
    .from('view_events')
    .select('id')
    .eq('share_id', shareId)
    .eq('session_id', sessionId)
    .eq('event_type', eventType)
    .eq('path', path as string)
    .gte('created_at', cutoff)
    .limit(1)
    .maybeSingle()

  if (lookupError) {
    throw lookupError
  }
  if (recentEvent) {
    return { recorded: false }
  }

  const { error: insertError } = await admin.from('view_events').insert({
    share_id: shareId,
    session_id: sessionId,
    event_type: eventType,
    path,
    metadata,
  })

  if (insertError) {
    throw insertError
  }

  return { recorded: true }
}
