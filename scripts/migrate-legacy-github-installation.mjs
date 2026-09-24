import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import { createClient } from '@supabase/supabase-js'

const installationId = Number(process.env.GITHUB_APP_INSTALLATION_ID)
if (!Number.isSafeInteger(installationId) || installationId <= 0) {
  throw new Error('GITHUB_APP_INSTALLATION_ID must be set only for this one-time migration.')
}

const appId = Number(process.env.GITHUB_APP_ID)
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!Number.isSafeInteger(appId) || appId <= 0 || !privateKey || !supabaseUrl || !serviceRoleKey) {
  throw new Error('GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, Supabase URL, and service-role key are required.')
}

const appAuth = createAppAuth({ appId, privateKey })
const { token: appToken } = await appAuth({ type: 'app' })
const github = new Octokit({ auth: appToken })
const { data: installation } = await github.rest.apps.getInstallation({ installation_id: installationId })
const account = installation.account

if (!account || typeof account.id !== 'number' || !account.login || !['User', 'Organization', 'Bot'].includes(account.type)) {
  throw new Error('GitHub returned incomplete installation account metadata.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
})

const { data: workspace, error: workspaceError } = await supabase
  .from('workspaces')
  .select('id')
  .order('created_at', { ascending: true })
  .limit(1)
  .single()

if (workspaceError || !workspace) {
  throw new Error('The legacy RepoView workspace could not be found.')
}

const { data: legacyRow, error: lookupError } = await supabase
  .from('github_installations')
  .select('id')
  .eq('workspace_id', workspace.id)
  .eq('status', 'pending_migration')
  .maybeSingle()

if (lookupError || !legacyRow) {
  throw new Error('The pending legacy GitHub installation row could not be found.')
}

const { error: updateError } = await supabase
  .from('github_installations')
  .update({
    github_installation_id: installation.id,
    github_account_id: account.id,
    github_account_login: account.login,
    github_account_type: account.type,
    repository_selection: installation.repository_selection === 'all' ? 'all' : 'selected',
    permissions: installation.permissions ?? {},
    status: installation.suspended_at ? 'suspended' : 'active',
    suspended_at: installation.suspended_at,
  })
  .eq('id', legacyRow.id)
  .eq('workspace_id', workspace.id)

if (updateError) {
  throw new Error('The legacy GitHub installation could not be migrated.')
}

console.log(`Migrated GitHub installation ${installation.id} into workspace ${workspace.id}.`)
