import { NextResponse } from 'next/server'
import { z } from 'zod'

import { clearAccountReauthPending, issueStepUpConfirmation, readAccountReauthPending } from '@/lib/account/step-up'
import { isAllowedRequestOrigin } from '@/lib/security/origin'
import { checkPublicRateLimit, rateLimitResponse, rateLimitUnavailableResponse } from '@/lib/security/rate-limit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const requestSchema = z.object({
  operation: z.enum(['account-delete', 'account-export']),
  code: z.string().regex(/^\d{6}$/),
})

export async function POST(request: Request) {
  if (!isAllowedRequestOrigin(request)) return json({ error: 'invalid_origin' }, 403)

  let input: z.infer<typeof requestSchema>
  try {
    input = requestSchema.parse(await request.json())
  } catch {
    return json({ error: 'invalid_request' }, 400)
  }

  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return json({ error: 'authentication_required' }, 401)

  const pending = await readAccountReauthPending()
  if (!pending || pending.userId !== authData.user.id || pending.operation !== input.operation || pending.expiresAt <= Math.floor(Date.now() / 1000)) {
    return json({ error: 'reauthentication_required' }, 401)
  }

  try {
    const decision = await checkPublicRateLimit(request, 'authenticated-account-reauth', [`user:${authData.user.id}`])
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  const factors = await supabase.auth.mfa.listFactors()
  if (factors.error || !factors.data) return json({ error: 'reauthentication_unavailable' }, 503)

  const verifiedFactors = factors.data.all.filter((factor) => factor.status === 'verified')
  let verified = false
  for (const factor of verifiedFactors) {
    const result = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: input.code })
    if (!result.error) {
      verified = true
      break
    }
  }
  if (!verified) return json({ error: 'invalid_mfa' }, 401)

  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (assurance.error || assurance.data.currentLevel !== 'aal2') return json({ error: 'mfa_required' }, 428)

  try {
    await issueStepUpConfirmation({
      admin: createSupabaseAdminClient(),
      user: authData.user,
      operation: pending.operation,
      assuranceLevel: 'aal2',
      method: pending.method,
    })
    await clearAccountReauthPending()
    return json({ authenticated: true })
  } catch {
    return json({ error: 'reauthentication_unavailable' }, 503)
  }
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
