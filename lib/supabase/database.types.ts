export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type TableDefinition<Row extends Record<string, unknown>, Insert extends Record<string, unknown>, Update extends Record<string, unknown>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type WorkspaceRole = 'owner' | 'admin' | 'member'

type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

type Workspace = {
  id: string
  name: string
  slug: string
  owner_id: string
  created_at: string
  updated_at: string
}

type WorkspaceMember = {
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  created_at: string
  updated_at: string
}

type NotificationSettings = {
  id: string
  workspace_id: string
  notification_email: string | null
  notify_on_view: boolean
  created_at: string
  updated_at: string
}

type GitHubInstallation = {
  id: string
  workspace_id: string
  github_installation_id: number
  github_account_id: number
  github_account_login: string
  github_account_type: 'User' | 'Organization' | 'Bot'
  repository_selection: 'all' | 'selected'
  permissions: Json
  status: 'active' | 'suspended' | 'deleted' | 'pending_migration'
  suspended_at: string | null
  created_at: string
  updated_at: string
}

type Repository = {
  id: string
  workspace_id: string
  github_installation_id: string
  github_repository_id: number | null
  github_node_id: string | null
  github_owner: string
  github_repo: string
  default_branch: string
  enabled: boolean
  default_rules: Json
  created_at: string
  updated_at: string
}

type Share = {
  id: string
  workspace_id: string
  repository_id: string
  share_code: string
  token_hash: string
  share_type: 'generic' | 'recipient'
  recipient_label: string | null
  commit_sha: string | null
  ref: string
  expires_at: string | null
  revoked_at: string | null
  notify_on_view: boolean
  allow_download: boolean
  rules: Json
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

type ShareRecipient = {
  share_id: string
  workspace_id: string
  recipient_name: string | null
  company: string | null
  email: string | null
  role_notes: string | null
  created_at: string
  updated_at: string
}

type Viewer = {
  id: string
  workspace_id: string
  viewer_code: string
  viewer_token_hash: string
  first_seen_at: string
  last_seen_at: string
}

type ViewerSession = {
  id: string
  share_id: string
  workspace_id: string
  viewer_id: string | null
  session_token_hash: string
  first_seen_at: string
  last_seen_at: string
  ended_at: string | null
  confirmed_at: string | null
  notified_at: string | null
  session_summary_notified_at: string | null
  active_ms: number
  idle_ms: number
  entry_path: string | null
  exit_path: string | null
  referrer_url: string | null
  user_agent: string | null
  browser: string | null
  browser_version: string | null
  rendering_engine: string | null
  os: string | null
  os_version: string | null
  architecture: string | null
  device_type: string | null
  primary_language: string | null
  languages: Json | null
  browser_timezone: string | null
  screen_width: number | null
  screen_height: number | null
  viewport_width: number | null
  viewport_height: number | null
  pixel_ratio: number | null
  color_depth: number | null
  orientation: string | null
  logical_cpu_count: number | null
  approximate_memory_gb: number | null
  touch_capable: boolean | null
  dark_mode: boolean | null
  reduced_motion: boolean | null
  public_ip: string | null
  ip_version: number | null
  asn: string | null
  asn_organization: string | null
  isp_organization: string | null
  network_classification: string | null
  vpn_indication: boolean | null
  proxy_indication: boolean | null
  tor_indication: boolean | null
  datacenter_indication: boolean | null
  http_protocol: string | null
  country: string | null
  region: string | null
  region_code: string | null
  city: string | null
  postal_area: string | null
  timezone: string | null
  continent: string | null
  approximate_latitude: number | null
  approximate_longitude: number | null
  referrer_host: string | null
  ip_hash: string | null
  network_key_hash: string | null
  device_profile_hash: string | null
  security_signals: Json
  visibility_changes: number
  focus_changes: number
  max_directory_depth: number
  token_age_seconds: number | null
  is_returning_visit: boolean
  previous_visit_count: number
  is_probable_bot: boolean
}

type ViewEvent = {
  id: number
  share_id: string
  session_id: string
  workspace_id: string
  event_type: string
  path: string | null
  metadata: Json
  created_at: string
}

type RepositoryEvent = ViewEvent & {
  viewer_id: string | null
  occurred_at: string
}

type FileEngagement = {
  id: string
  share_id: string
  session_id: string
  workspace_id: string
  viewer_id: string | null
  path: string
  content_kind: string | null
  first_viewed_at: string
  last_viewed_at: string
  view_count: number
  active_ms: number
  idle_ms: number
  max_scroll_percent: number
  first_view_order: number | null
}

type ShareAccessAttempt = {
  id: string
  share_id: string | null
  workspace_id: string | null
  token_hash: string
  valid: boolean
  failure_reason: string | null
  token_age_seconds: number | null
  public_ip: string | null
  referrer_host: string | null
  browser: string | null
  os: string | null
  device_type: string | null
  is_probable_bot: boolean
  created_at: string
}

type NotificationDelivery = {
  id: string
  share_id: string
  session_id: string
  workspace_id: string
  channel: string
  notification_kind: string
  status: string
  error_text: string | null
  payload: Json
  created_at: string
  sent_at: string | null
}

type AuditLog = {
  id: number
  workspace_id: string
  actor_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  metadata: Json
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: TableDefinition<Profile, Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>> & Pick<Profile, 'id'> & { created_at?: string; updated_at?: string }, Partial<Omit<Profile, 'id' | 'created_at'>>>
      workspaces: TableDefinition<Workspace, Partial<Omit<Workspace, 'id' | 'created_at' | 'updated_at'>> & Pick<Workspace, 'name' | 'slug' | 'owner_id'> & { id?: string; created_at?: string; updated_at?: string }, Partial<Omit<Workspace, 'id' | 'created_at'>>>
      workspace_members: TableDefinition<WorkspaceMember, Partial<Omit<WorkspaceMember, 'created_at' | 'updated_at'>> & Pick<WorkspaceMember, 'workspace_id' | 'user_id'> & { created_at?: string; updated_at?: string }, Partial<Omit<WorkspaceMember, 'workspace_id' | 'user_id' | 'created_at'>>>
      notification_settings: TableDefinition<NotificationSettings, Partial<Omit<NotificationSettings, 'id' | 'created_at' | 'updated_at'>> & Pick<NotificationSettings, 'workspace_id'> & { id?: string; created_at?: string; updated_at?: string }, Partial<Omit<NotificationSettings, 'id' | 'workspace_id' | 'created_at'>>>
      github_installations: TableDefinition<GitHubInstallation, Partial<Omit<GitHubInstallation, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>> & Pick<GitHubInstallation, 'workspace_id' | 'github_installation_id' | 'github_account_id' | 'github_account_login' | 'github_account_type' | 'repository_selection'> & { id?: string; permissions?: Json; status?: GitHubInstallation['status']; suspended_at?: string | null; created_at?: string; updated_at?: string }, Partial<Omit<GitHubInstallation, 'id' | 'workspace_id' | 'created_at'>>>
      repositories: TableDefinition<Repository, Partial<Omit<Repository, 'id' | 'created_at' | 'updated_at'>> & Pick<Repository, 'workspace_id' | 'github_installation_id' | 'github_owner' | 'github_repo' | 'default_branch'> & { id?: string; created_at?: string; updated_at?: string }, Partial<Omit<Repository, 'id' | 'workspace_id' | 'created_at'>>>
      shares: TableDefinition<Share, Partial<Omit<Share, 'id' | 'created_at' | 'updated_at'>> & Pick<Share, 'workspace_id' | 'repository_id' | 'token_hash' | 'ref'> & { id?: string; created_at?: string; updated_at?: string }, Partial<Omit<Share, 'id' | 'workspace_id' | 'created_at'>>>
      share_recipients: TableDefinition<ShareRecipient, Partial<Omit<ShareRecipient, 'created_at' | 'updated_at'>> & Pick<ShareRecipient, 'share_id' | 'workspace_id'> & { created_at?: string; updated_at?: string }, Partial<Omit<ShareRecipient, 'share_id' | 'workspace_id' | 'created_at'>>>
      viewers: TableDefinition<Viewer, Partial<Omit<Viewer, 'id' | 'first_seen_at' | 'last_seen_at'>> & Pick<Viewer, 'workspace_id' | 'viewer_code' | 'viewer_token_hash'> & { id?: string; first_seen_at?: string; last_seen_at?: string }, Partial<Omit<Viewer, 'id' | 'workspace_id' | 'viewer_token_hash'>>>
      viewer_sessions: TableDefinition<ViewerSession, Partial<Omit<ViewerSession, 'id' | 'first_seen_at' | 'last_seen_at'>> & Pick<ViewerSession, 'workspace_id' | 'share_id' | 'session_token_hash'> & { id?: string; first_seen_at?: string; last_seen_at?: string }, Partial<Omit<ViewerSession, 'id' | 'workspace_id' | 'share_id' | 'session_token_hash'>>>
      view_events: TableDefinition<ViewEvent, Partial<Omit<ViewEvent, 'id' | 'created_at'>> & Pick<ViewEvent, 'workspace_id' | 'share_id' | 'session_id' | 'event_type'> & { id?: never; created_at?: string }, never>
      repository_events: TableDefinition<RepositoryEvent, Partial<Omit<RepositoryEvent, 'id' | 'created_at'>> & Pick<RepositoryEvent, 'workspace_id' | 'id' | 'share_id' | 'session_id' | 'event_type' | 'occurred_at'>, never>
      file_engagement: TableDefinition<FileEngagement, Partial<Omit<FileEngagement, 'id' | 'first_viewed_at' | 'last_viewed_at'>> & Pick<FileEngagement, 'workspace_id' | 'share_id' | 'session_id' | 'path'> & { id?: string; first_viewed_at?: string; last_viewed_at?: string }, Partial<Omit<FileEngagement, 'id' | 'workspace_id' | 'share_id' | 'session_id' | 'path'>>>
      share_access_attempts: TableDefinition<ShareAccessAttempt, Partial<Omit<ShareAccessAttempt, 'id' | 'created_at'>> & Pick<ShareAccessAttempt, 'token_hash' | 'valid'> & { id?: string; created_at?: string }, never>
      notification_deliveries: TableDefinition<NotificationDelivery, Partial<Omit<NotificationDelivery, 'id' | 'created_at'>> & Pick<NotificationDelivery, 'workspace_id' | 'share_id' | 'session_id' | 'status'> & { id?: string; created_at?: string }, Partial<Omit<NotificationDelivery, 'id' | 'workspace_id' | 'created_at'>>>
      audit_logs: TableDefinition<AuditLog, Partial<Omit<AuditLog, 'id' | 'created_at'>> & Pick<AuditLog, 'workspace_id' | 'action' | 'resource_type'> & { id?: never; created_at?: string }, never>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
