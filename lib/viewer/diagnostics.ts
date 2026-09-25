import 'server-only'

type DiagnosticValue = boolean | number | string | null | undefined

/**
 * Keep viewer diagnostics useful in server logs without ever including raw
 * share/session tokens, cookie values, or provider credentials.
 */
export function logViewerDiagnostic(
  stage: string,
  details: Record<string, DiagnosticValue>,
) {
  if (process.env.NODE_ENV === 'test') return

  const payload = { stage, ...details }
  if (/failed|invalid|missing|unavailable|revoked|expired|disabled|invariant/.test(stage)) {
    console.error('RepoView viewer diagnostic', payload)
  } else {
    console.info('RepoView viewer diagnostic', payload)
  }
}

export function summarizeViewerError(error: unknown) {
  if (error instanceof Error) {
    const candidate = error as Error & { code?: unknown; status?: unknown }
    return {
      name: error.name,
      ...(typeof candidate.code === 'string' ? { code: candidate.code } : {}),
      ...(typeof candidate.status === 'number' ? { status: candidate.status } : {}),
      message: redactSensitiveValues(error.message),
    }
  }

  return { name: 'UnknownError', message: 'Unknown error' }
}

function redactSensitiveValues(value: string) {
  return value
    .replace(/[A-Za-z0-9_-]{32,}/g, '[redacted]')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
}
