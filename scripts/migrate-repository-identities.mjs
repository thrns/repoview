import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import { createClient } from '@supabase/supabase-js'

const appId = Number(process.env.GITHUB_APP_ID)
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!Number.isSafeInteger(appId) || appId <= 0 || !privateKey || !supabaseUrl || !serviceRoleKey) {
  throw new Error('GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, Supabase URL, and service-role key are required.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
})

const { data: repositories, error: repositoryError } = await supabase
  .from('repositories')
  .select('id, workspace_id, github_installation_id, github_owner, github_repo')
  .is('github_repository_id', null)
  .order('created_at', { ascending: true })

if (repositoryError) {
  throw new Error(`Could not load repositories awaiting identity migration: ${repositoryError.message}`)
}

const clients = new Map()

for (const repository of repositories ?? []) {
  const { data: installation, error: installationError } = await supabase
    .from('github_installations')
    .select('github_installation_id, status')
    .eq('id', repository.github_installation_id)
    .eq('workspace_id', repository.workspace_id)
    .maybeSingle()

  if (installationError || !installation || installation.status !== 'active' || installation.github_installation_id <= 0) {
    throw new Error(`Repository ${repository.id} is linked to an installation that is not ready for identity migration.`)
  }

  let github = clients.get(installation.github_installation_id)
  if (!github) {
    const authOptions = {
      appId,
      installationId: installation.github_installation_id,
      privateKey,
    }
    github = new Octokit({
      authStrategy: createAppAuth,
      auth: authOptions,
      baseUrl: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    clients.set(installation.github_installation_id, github)
  }

  const { data } = await github.rest.repos.get({
    owner: repository.github_owner,
    repo: repository.github_repo,
  })

  if (!Number.isSafeInteger(data.id) || data.id <= 0 || typeof data.node_id !== 'string' || !data.node_id) {
    throw new Error(`GitHub returned incomplete identity metadata for ${repository.github_owner}/${repository.github_repo}.`)
  }

  const { error: updateError } = await supabase
    .from('repositories')
    .update({
      github_repository_id: data.id,
      github_node_id: data.node_id,
      github_owner: data.owner.login,
      github_repo: data.name,
      default_branch: data.default_branch,
    })
    .eq('id', repository.id)
    .eq('workspace_id', repository.workspace_id)
    .is('github_repository_id', null)

  if (updateError) {
    throw new Error(`Could not save the GitHub identity for ${repository.github_owner}/${repository.github_repo}: ${updateError.message}`)
  }

  console.log(`Migrated repository ${repository.id} to GitHub repository ${data.id} (${data.full_name}).`)
}

console.log(`Repository identity migration complete: ${repositories?.length ?? 0} row(s) processed.`)
