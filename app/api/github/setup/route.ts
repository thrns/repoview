import { NextResponse } from 'next/server'

import {
  beginGitHubAuthorization,
  markGitHubConnectionFinished,
  markGitHubConnectionPending,
} from '@/lib/github/connection-flow'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get('state') ?? ''
  const setupAction = (requestUrl.searchParams.get('setup_action') ?? '').toLowerCase()

  try {
    if (setupAction === 'request' || setupAction === 'pending' || setupAction === 'pending_approval') {
      const returnPath = await markGitHubConnectionPending(state)
      return redirectToStatus(request, 'pending', returnPath)
    }

    if (setupAction === 'cancel' || setupAction === 'cancelled' || setupAction === 'canceled') {
      const returnPath = await markGitHubConnectionFinished(state, 'cancelled')
      return redirectToStatus(request, 'cancelled', returnPath)
    }

    const installationId = parseInstallationId(requestUrl.searchParams.get('installation_id'))
    if (!installationId) {
      await markGitHubConnectionFinished(state, 'failed')
      return redirectToStatus(request, 'error')
    }

    const authorizationUrl = await beginGitHubAuthorization(state, installationId)
    return redirectTo(authorizationUrl)
  } catch (error) {
    if (isNextRedirectError(error)) throw error
    return redirectToStatus(request, 'error')
  }
}

function parseInstallationId(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null
  const installationId = Number(value)
  return Number.isSafeInteger(installationId) && installationId > 0 ? installationId : null
}

function redirectToStatus(request: Request, status: string, returnPath = '/dashboard/settings') {
  const url = new URL(returnPath, request.url)
  url.searchParams.set('github', status)
  return redirectTo(url.toString())
}

function redirectTo(url: string) {
  const response = NextResponse.redirect(url, 303)
  response.headers.set('Cache-Control', 'no-store')
  return response
}

function isNextRedirectError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'digest' in error && String(error.digest).startsWith('NEXT_REDIRECT'))
}
