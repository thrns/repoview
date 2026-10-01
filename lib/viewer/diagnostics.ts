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

/** Keep database failures useful in server logs without logging arbitrary error objects. */
export function summarizeDatabaseError(error: unknown) {
  if (!error || typeof error !== 'object') return {}

  const candidate = error as Record<string, unknown>
  return {
    ...(typeof candidate.code === 'string' ? { errorCode: sanitizeDiagnosticText(candidate.code, 32) } : {}),
    ...(typeof candidate.message === 'string' ? { errorMessage: sanitizeDiagnosticText(candidate.message) } : {}),
    ...(typeof candidate.details === 'string' ? { errorDetails: sanitizeDiagnosticText(candidate.details) } : {}),
    ...(typeof candidate.hint === 'string' ? { errorHint: sanitizeDiagnosticText(candidate.hint) } : {}),
  }
}

function redactSensitiveValues(value: string) {
  return value
    .replace(/[A-Za-z0-9_-]{32,}/g, '[redacted]')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
}

function sanitizeDiagnosticText(value: string, maxLength = 500) {
  return value
    .replace(/(?:postgres(?:ql)?|https?):\/\/[^\s"'<>]+/gi, '[redacted-url]')
    .replace(/\b([\w.-]*(?:password|passwd|secret|token|api[\s_-]?key|authorization|credential|private[\s_-]?key|service[\s_-]?role[\s_-]?key))\b\s*[:=]\s*(?:Bearer\s+)?("[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1=[redacted]')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/[A-Za-z0-9_-]{32,}/g, '[redacted]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, maxLength)
}
