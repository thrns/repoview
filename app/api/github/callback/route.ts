import { NextResponse } from 'next/server'

import {
  completeGitHubConnection,
  GitHubConnectionError,
  markGitHubConnectionFinished,
} from '@/lib/github/connection-flow'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get('state') ?? ''
  const providerError = requestUrl.searchParams.get('error')

  try {
    if (providerError) {
      const status = providerError === 'access_denied' ? 'denied' : providerError === 'cancelled' ? 'cancelled' : 'error'
      const returnPath = await markGitHubConnectionFinished(state, status === 'cancelled' ? 'cancelled' : 'failed')
      return redirectToStatus(request, status, returnPath)
    }

    const code = requestUrl.searchParams.get('code')
    if (!code) return redirectToStatus(request, 'error')

    const result = await completeGitHubConnection(state, code)
    if (result.status === 'pending') return redirectToStatus(request, 'pending', result.returnPath)

    const url = new URL(result.returnPath === '/onboarding' ? '/onboarding' : '/dashboard/repositories', request.url)
    url.searchParams.set('github', 'success')
    url.searchParams.set('repositories', String(result.repositoryCount))
    return redirectTo(url)
  } catch (error) {
    if (isNextRedirectError(error)) throw error
    const status = error instanceof GitHubConnectionError && error.code === 'denied' ? 'denied' : 'error'
    return redirectToStatus(request, status)
  }
}

function redirectToStatus(request: Request, status: string, returnPath = '/dashboard/settings') {
  const url = new URL(returnPath, request.url)
  url.searchParams.set('github', status)
  return redirectTo(url)
}

function redirectTo(url: URL) {
  const response = NextResponse.redirect(url, 303)
  response.headers.set('Cache-Control', 'no-store')
  return response
}

function isNextRedirectError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'digest' in error && String(error.digest).startsWith('NEXT_REDIRECT'))
}
