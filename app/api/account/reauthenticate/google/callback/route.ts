import { NextResponse } from 'next/server'

import { consumeAccountReauthState, issueStepUpConfirmation, setAccountReauthPending } from '@/lib/account/step-up'
import { getPublicEnv } from '@/lib/env/public'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const state = requestUrl.searchParams.get('state')
  const code = requestUrl.searchParams.get('code')
  if (!state || !code) return redirectToSettings('reauth_error')

  const reauthState = await consumeAccountReauthState(state)
  if (!reauthState) return redirectToSettings('reauth_error')

  const supabase = await createSupabaseServerClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) return redirectToSettings('reauth_error', reauthState.operation)

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user || authData.user.id !== reauthState.userId) {
    await supabase.auth.signOut({ scope: 'local' })
    return redirectToSettings('reauth_error')
  }

  const factors = await supabase.auth.mfa.listFactors()
  if (factors.error || !factors.data) return redirectToSettings('reauth_error', reauthState.operation)
  const verifiedFactors = factors.data.all.filter((factor) => factor.status === 'verified')

  if (verifiedFactors.length > 0) {
    await setAccountReauthPending({
      userId: authData.user.id,
      operation: reauthState.operation,
      method: 'google',
      expiresAt: Math.floor(Date.now() / 1000) + 10 * 60,
    })
    return redirectToSettings('mfa', reauthState.operation)
  }

  try {
    await issueStepUpConfirmation({
      admin: createSupabaseAdminClient(),
      user: authData.user,
      operation: reauthState.operation,
      assuranceLevel: 'aal1',
      method: 'google',
    })
    return redirectToSettings('success', reauthState.operation)
  } catch {
    return redirectToSettings('reauth_error', reauthState.operation)
  }
}

function redirectToSettings(status: string, operation?: string) {
  const url = new URL('/dashboard/settings', getPublicEnv().NEXT_PUBLIC_APP_URL)
  url.searchParams.set('reauth', status)
  if (operation) url.searchParams.set('operation', operation)
  const response = NextResponse.redirect(url, 303)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
