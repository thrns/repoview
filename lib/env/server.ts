import 'server-only'

import { parseServerEnv, type ServerEnv } from './schema'

export { parseServerEnv, type ServerEnv } from './schema'

let cachedServerEnv: ServerEnv | undefined

export function getServerEnv() {
  cachedServerEnv ??= parseServerEnv()
  return cachedServerEnv
}

export function getConfiguredAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || undefined
}
