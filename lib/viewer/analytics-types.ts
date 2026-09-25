export const VIEWER_ANALYTICS_EVENT_TYPES = [
  'repository_opened',
  'directory_opened',
  'file_opened',
  'file_viewed',
  'markdown_viewed',
  'mermaid_viewed',
  'image_viewed',
  'raw_file_viewed',
  'search',
  'search_result_clicked',
  'copy',
  'download',
  'session_ended',
] as const

export type ViewerAnalyticsEventType = typeof VIEWER_ANALYTICS_EVENT_TYPES[number]

export type ViewerClientContext = {
  deviceType?: 'desktop' | 'mobile' | 'tablet' | null
  browser?: string | null
  os?: string | null
}

export type ViewerAnalyticsEvent = {
  eventId?: string
  eventType: ViewerAnalyticsEventType
  path?: string | null
  metadata?: Record<string, string | number | boolean | null>
  clientSequence?: number
}

export type ViewerSessionSnapshot = {
  activeMs: number
  entryPath?: string | null
  exitPath?: string | null
  ended?: boolean
}
