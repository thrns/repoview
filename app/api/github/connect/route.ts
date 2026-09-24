import { NextResponse } from 'next/server'

import { createGitHubInstallationUrl } from '@/lib/github/connection-flow'
import { RateLimitExceededError, RateLimitUnavailableError, rateLimitResponse, rateLimitUnavailableResponse } from '../../../../lib/security/rate-limit'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const returnPath = new URL(request.url).searchParams.get('return') ?? undefined
    const installationUrl = await createGitHubInstallationUrl(returnPath)
    return redirectTo(installationUrl)
  } catch (error) {
    if (isNextRedirectError(error)) throw error
    if (error instanceof RateLimitExceededError) return rateLimitResponse(error.decision)
    if (error instanceof RateLimitUnavailableError) return rateLimitUnavailableResponse()
    return redirectToStatus(request, 'error')
  }
}

function redirectTo(url: string) {
  const response = NextResponse.redirect(url, 303)
  response.headers.set('Cache-Control', 'no-store')
  return response
}

function redirectToStatus(request: Request, status: string) {
  const url = new URL('/dashboard/settings', request.url)
  url.searchParams.set('github', status)
  return redirectTo(url.toString())
}

function isNextRedirectError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'digest' in error && String(error.digest).startsWith('NEXT_REDIRECT'))
}
