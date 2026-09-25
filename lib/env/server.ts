import 'server-only'

import {
  parseRateLimitEnv,
  parseServerEnv,
  parseSupabaseAdminEnv,
  type RateLimitEnv,
  type ServerEnv,
  type SupabaseAdminEnv,
} from './schema'

export {
  parseRateLimitEnv,
  parseServerEnv,
  parseSupabaseAdminEnv,
  type RateLimitEnv,
  type ServerEnv,
  type SupabaseAdminEnv,
} from './schema'

let cachedServerEnv: ServerEnv | undefined
let cachedRateLimitEnv: RateLimitEnv | undefined
let cachedSupabaseAdminEnv: SupabaseAdminEnv | undefined

export function getServerEnv() {
  cachedServerEnv ??= parseServerEnv()
  return cachedServerEnv
}

export function getRateLimitEnv() {
  cachedRateLimitEnv ??= parseRateLimitEnv()
  return cachedRateLimitEnv
}

export function getSupabaseAdminEnv() {
  cachedSupabaseAdminEnv ??= parseSupabaseAdminEnv()
  return cachedSupabaseAdminEnv
}
