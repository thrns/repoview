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
  'code_selected',
  'copy',
  'download',
  'external_link_clicked',
  'scroll_depth',
  'tab_visibility_changed',
  'focus_changed',
  'session_ended',
] as const

export type ViewerAnalyticsEventType = typeof VIEWER_ANALYTICS_EVENT_TYPES[number]

export type ViewerClientContext = {
  deviceType?: 'desktop' | 'mobile' | 'tablet' | null
  browser?: string | null
  browserVersion?: string | null
  renderingEngine?: string | null
  os?: string | null
  osVersion?: string | null
  architecture?: string | null
  primaryLanguage?: string | null
  languages?: string[]
  browserTimezone?: string | null
  screenWidth?: number | null
  screenHeight?: number | null
  viewportWidth?: number | null
  viewportHeight?: number | null
  pixelRatio?: number | null
  colorDepth?: number | null
  orientation?: string | null
  logicalCpuCount?: number | null
  approximateMemoryGb?: number | null
  touchCapable?: boolean | null
  darkMode?: boolean | null
  reducedMotion?: boolean | null
}

export type ViewerAnalyticsEvent = {
  eventType: ViewerAnalyticsEventType
  path?: string | null
  metadata?: Record<string, string | number | boolean | null>
  clientSequence?: number
}

export type ViewerSessionSnapshot = {
  activeMs: number
  idleMs: number
  entryPath?: string | null
  exitPath?: string | null
  visibilityChanges: number
  focusChanges: number
  ended?: boolean
}
