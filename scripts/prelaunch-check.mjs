import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

import { createClient } from '@supabase/supabase-js'

export async function runPrelaunchCheck(supabase) {
  const { data, error } = await supabase.rpc('prelaunch_check')

  if (error) {
    throw new Error(`The database prelaunch check could not run: ${error.message}`)
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('The database prelaunch check returned no checks. Apply the latest Supabase migrations and rerun pnpm prelaunch:check.')
  }

  return data
}

export function formatPrelaunchFailures(failures) {
  return [
    'RepoView prelaunch check FAILED.',
    '',
    ...failures.map((failure) => `- ${failure.check_name}: ${failure.details}`),
    '',
    'No production data was changed. Fix the reported data or migration issue, then rerun pnpm prelaunch:check.',
  ].join('\n')
}

function createPrelaunchClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to run pnpm prelaunch:check.')
  }

  try {
    new URL(supabaseUrl)
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid URL to run pnpm prelaunch:check.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}

export async function main() {
  try {
    const checks = await runPrelaunchCheck(createPrelaunchClient())
    const failures = checks.filter((check) => check?.passed !== true)

    if (failures.length > 0) {
      console.error(formatPrelaunchFailures(failures))
      process.exitCode = 1
      return
    }

    console.log(`RepoView prelaunch check PASSED (${checks.length} invariants). No production data was changed.`)
  } catch (error) {
    console.error(`RepoView prelaunch check FAILED: ${error instanceof Error ? error.message : 'Unknown error.'}`)
    process.exitCode = 1
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main()
}
