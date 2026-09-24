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
  profile_completed_at: string | null
  terms_version_accepted: string | null
  terms_accepted_at: string | null
  privacy_version_acknowledged: string | null
  privacy_acknowledged_at: string | null
  onboarding_completed_at: string | null
  created_at: string
  updated_at: string
}

type Workspace = {
  id: string
  name: string
  slug: string
  owner_id: string
  is_personal: boolean
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
  destination_email: string | null
  email_verified: boolean
  view_opened: boolean
  returning_view: boolean
  download: boolean
  session_summary: boolean
  security_alerts: boolean
  digest_frequency: 'off' | 'daily' | 'weekly'
  analytics_enabled: boolean
  analytics_retention_days: 30 | 90 | 180 | 365
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

type GitHubConnectionTransaction = {
  id: string
  workspace_id: string
  user_id: string
  state_hash: string
  code_verifier: string
  claimed_installation_id: number | null
  status: 'pending_installation' | 'awaiting_authorization' | 'pending_approval' | 'consumed' | 'cancelled' | 'failed'
  return_path: string
  expires_at: string
  consumed_at: string | null
  created_at: string
  updated_at: string
}

type GitHubWebhookDelivery = {
  delivery_id: string
  event: string
  action: string
  installation_id: number | null
  status: 'processing' | 'processed' | 'ignored' | 'failed'
  received_at: string
  processed_at: string | null
  error: string | null
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

type ViewerPrivacyPreference = {
  id: string
  preference_key_hash: string
  analytics_mode: 'necessary' | 'optional'
  gpc_applied: boolean
  created_at: string
  updated_at: string
}

type ViewerSession = {
  id: string
  share_id: string
  workspace_id: string
  viewer_id: string | null
  analytics_mode: 'necessary' | 'optional'
  gpc_applied: boolean
  session_token_hash: string
  first_seen_at: string
  last_seen_at: string
  ended_at: string | null
  confirmed_at: string | null
  notified_at: string | null
  session_summary_notified_at: string | null
  active_ms: number
  entry_path: string | null
  exit_path: string | null
  referrer_host: string | null
  browser: string | null
  os: string | null
  device_type: string | null
  vpn_indication: boolean | null
  proxy_indication: boolean | null
  tor_indication: boolean | null
  datacenter_indication: boolean | null
  country: string | null
  region: string | null
  city: string | null
  ip_hash: string | null
  security_signals: Json
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
  ip_hash: string | null
  referrer_host: string | null
  is_probable_bot: boolean
  created_at: string
}

type NotificationDelivery = {
  id: string
  share_id: string
  session_id: string
  workspace_id: string
  channel: string
  recipient: string
  notification_kind: string
  status: 'pending' | 'processing' | 'sent' | 'retryable' | 'permanent' | 'failed'
  attempt_count: number
  provider_message_id: string | null
  last_error: string | null
  next_retry_at: string | null
  idempotency_key: string | null
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
      github_connection_transactions: TableDefinition<GitHubConnectionTransaction, Partial<Omit<GitHubConnectionTransaction, 'id' | 'created_at' | 'updated_at'>> & Pick<GitHubConnectionTransaction, 'workspace_id' | 'user_id' | 'state_hash' | 'code_verifier' | 'expires_at'> & { id?: string; status?: GitHubConnectionTransaction['status']; claimed_installation_id?: number | null; return_path?: string; consumed_at?: string | null; created_at?: string; updated_at?: string }, Partial<Omit<GitHubConnectionTransaction, 'id' | 'workspace_id' | 'user_id' | 'created_at'>>>
      github_webhook_deliveries: TableDefinition<GitHubWebhookDelivery, Partial<Omit<GitHubWebhookDelivery, 'received_at'>> & Pick<GitHubWebhookDelivery, 'delivery_id' | 'event' | 'action'> & { installation_id?: number | null; status?: GitHubWebhookDelivery['status']; received_at?: string; processed_at?: string | null; error?: string | null }, Partial<Omit<GitHubWebhookDelivery, 'delivery_id' | 'received_at'>>>
      repositories: TableDefinition<Repository, Partial<Omit<Repository, 'id' | 'created_at' | 'updated_at'>> & Pick<Repository, 'workspace_id' | 'github_installation_id' | 'github_owner' | 'github_repo' | 'default_branch'> & { id?: string; created_at?: string; updated_at?: string }, Partial<Omit<Repository, 'id' | 'workspace_id' | 'created_at'>>>
      shares: TableDefinition<Share, Partial<Omit<Share, 'id' | 'created_at' | 'updated_at'>> & Pick<Share, 'workspace_id' | 'repository_id' | 'token_hash' | 'ref'> & { id?: string; created_at?: string; updated_at?: string }, Partial<Omit<Share, 'id' | 'workspace_id' | 'created_at'>>>
      share_recipients: TableDefinition<ShareRecipient, Partial<Omit<ShareRecipient, 'created_at' | 'updated_at'>> & Pick<ShareRecipient, 'share_id' | 'workspace_id'> & { created_at?: string; updated_at?: string }, Partial<Omit<ShareRecipient, 'share_id' | 'workspace_id' | 'created_at'>>>
      viewers: TableDefinition<Viewer, Partial<Omit<Viewer, 'id' | 'first_seen_at' | 'last_seen_at'>> & Pick<Viewer, 'workspace_id' | 'viewer_code' | 'viewer_token_hash'> & { id?: string; first_seen_at?: string; last_seen_at?: string }, Partial<Omit<Viewer, 'id' | 'workspace_id' | 'viewer_token_hash'>>>
      viewer_privacy_preferences: TableDefinition<ViewerPrivacyPreference, Partial<Omit<ViewerPrivacyPreference, 'id' | 'created_at' | 'updated_at'>> & Pick<ViewerPrivacyPreference, 'preference_key_hash'> & { id?: string; created_at?: string; updated_at?: string }, Partial<Omit<ViewerPrivacyPreference, 'id' | 'created_at'>>>
      viewer_sessions: TableDefinition<ViewerSession, Partial<Omit<ViewerSession, 'id' | 'first_seen_at' | 'last_seen_at'>> & Pick<ViewerSession, 'workspace_id' | 'share_id' | 'session_token_hash'> & { id?: string; first_seen_at?: string; last_seen_at?: string }, Partial<Omit<ViewerSession, 'id' | 'workspace_id' | 'share_id' | 'session_token_hash'>>>
      view_events: TableDefinition<ViewEvent, Partial<Omit<ViewEvent, 'id' | 'created_at'>> & Pick<ViewEvent, 'workspace_id' | 'share_id' | 'session_id' | 'event_type'> & { id?: never; created_at?: string }, never>
      repository_events: TableDefinition<RepositoryEvent, Partial<Omit<RepositoryEvent, 'id' | 'created_at'>> & Pick<RepositoryEvent, 'workspace_id' | 'id' | 'share_id' | 'session_id' | 'event_type' | 'occurred_at'>, never>
      file_engagement: TableDefinition<FileEngagement, Partial<Omit<FileEngagement, 'id' | 'first_viewed_at' | 'last_viewed_at'>> & Pick<FileEngagement, 'workspace_id' | 'share_id' | 'session_id' | 'path'> & { id?: string; first_viewed_at?: string; last_viewed_at?: string }, Partial<Omit<FileEngagement, 'id' | 'workspace_id' | 'share_id' | 'session_id' | 'path'>>>
      share_access_attempts: TableDefinition<ShareAccessAttempt, Partial<Omit<ShareAccessAttempt, 'id' | 'created_at'>> & Pick<ShareAccessAttempt, 'token_hash' | 'valid'> & { id?: string; created_at?: string }, never>
      notification_deliveries: TableDefinition<NotificationDelivery, Partial<Omit<NotificationDelivery, 'id' | 'created_at'>> & Pick<NotificationDelivery, 'workspace_id' | 'share_id' | 'session_id' | 'status' | 'recipient'> & { id?: string; created_at?: string }, Partial<Omit<NotificationDelivery, 'id' | 'workspace_id' | 'created_at'>>>
      audit_logs: TableDefinition<AuditLog, Partial<Omit<AuditLog, 'id' | 'created_at'>> & Pick<AuditLog, 'workspace_id' | 'action' | 'resource_type'> & { id?: never; created_at?: string }, never>
    }
    Views: Record<string, never>
    Functions: {
      claim_github_connection_installation: {
        Args: { target_state_hash: string; target_user_id: string; target_installation_id: number }
        Returns: GitHubConnectionTransaction[]
      }
      consume_github_connection_transaction: {
        Args: { target_state_hash: string; target_user_id: string }
        Returns: GitHubConnectionTransaction[]
      }
      complete_profile: {
        Args: { target_full_name: string }
        Returns: Profile[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
