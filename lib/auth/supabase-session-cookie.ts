// Supabase SSR defaults to `sb-<project-ref>-auth-token`; numbered suffixes
// are used when that session cookie needs to be chunked.
const SUPABASE_SESSION_COOKIE = /^sb-.+-auth-token(?:\.\d+)?$/

export function hasSupabaseAuthCookie(cookies: ReadonlyArray<{ name: string }>) {
  return cookies.some(({ name }) => SUPABASE_SESSION_COOKIE.test(name))
}
