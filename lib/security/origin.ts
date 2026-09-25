import { getPublicEnv } from '../env/public'

/**
 * Destructive browser requests must identify the configured RepoView origin.
 * A missing Origin is rejected intentionally: account deletion is only a
 * first-party browser action, not an API intended for server-to-server use.
 */
export function isAllowedRequestOrigin(request: Pick<Request, 'headers'>) {
  const origin = request.headers.get('origin')
  if (!origin) return false

  try {
    return origin === new URL(getPublicEnv().NEXT_PUBLIC_APP_URL).origin
  } catch {
    return false
  }
}
