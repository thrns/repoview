const AUTH_CALLBACK_ALLOWED_PATHS = new Set(['/dashboard', '/onboarding', '/login'])

/**
 * Auth providers only need to return users to a small set of known RepoView
 * routes. Keeping this exact-match allowlist here prevents URL parser
 * normalization and backslash variants from becoming open redirects.
 */
export function getAuthCallbackRedirectPath(value: string | null) {
  return value && AUTH_CALLBACK_ALLOWED_PATHS.has(value) ? value : '/dashboard'
}
