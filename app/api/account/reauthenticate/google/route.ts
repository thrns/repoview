import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { setAccountReauthState } from '@/lib/account/step-up'
import { getPublicEnv } from '@/lib/env/public'
import { isAllowedRequestOrigin } from '@/lib/security/origin'
import { checkPublicRateLimit, rateLimitResponse, rateLimitUnavailableResponse } from '@/lib/security/rate-limit'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const operationSchema = z.enum(['account-delete', 'account-export'])

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const operation = operationSchema.safeParse(requestUrl.searchParams.get('operation'))
  if (!operation.success) return json({ error: 'invalid_request' }, 400)

  const origin = request.headers.get('origin')
  if (origin && !isAllowedRequestOrigin(request)) return json({ error: 'invalid_origin' }, 403)

  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return json({ error: 'authentication_required' }, 401)

  if (!authData.user.identities?.some((identity) => identity.provider === 'google')) {
    return json({ error: 'google_reauthentication_unavailable' }, 400)
  }

  try {
    const decision = await checkPublicRateLimit(request, 'authenticated-account-reauth', [`user:${authData.user.id}`])
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  const state = randomUUID()
  await setAccountReauthState({
    state,
    userId: authData.user.id,
    operation: operation.data,
    expiresAt: Math.floor(Date.now() / 1000) + 10 * 60,
  })

  const env = getPublicEnv()
  const callback = new URL('/api/account/reauthenticate/google/callback', env.NEXT_PUBLIC_APP_URL)
  callback.searchParams.set('state', state)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callback.toString(),
      queryParams: { prompt: 'login' },
    },
  })
  if (error || !data.url) return json({ error: 'google_reauthentication_unavailable' }, 503)

  const response = NextResponse.redirect(data.url, 303)
  response.headers.set('Cache-Control', 'no-store')
  return response
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
