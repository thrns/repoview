import { NextResponse } from 'next/server'
import { z } from 'zod'

import { issueStepUpConfirmation } from '@/lib/account/step-up'
import { isAllowedRequestOrigin } from '@/lib/security/origin'
import { checkPublicRateLimit, rateLimitResponse, rateLimitUnavailableResponse } from '@/lib/security/rate-limit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isRequestBodyTooLarge, readJsonBody } from '../../../../lib/security/body-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const requestSchema = z.object({
  operation: z.enum(['account-delete', 'account-export']),
  password: z.string().min(1).max(1024),
  mfaCode: z.string().regex(/^\d{6}$/).optional(),
})
const MAX_ACCOUNT_BODY_BYTES = 16 * 1024

export async function POST(request: Request) {
  if (!isAllowedRequestOrigin(request)) return json({ error: 'invalid_origin' }, 403)

  let input: z.infer<typeof requestSchema>
  try {
    input = requestSchema.parse(await readJsonBody(request, MAX_ACCOUNT_BODY_BYTES))
  } catch (error) {
    if (isRequestBodyTooLarge(error)) return json({ error: 'payload_too_large' }, 413)
    return json({ error: 'invalid_request' }, 400)
  }

  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return json({ error: 'authentication_required' }, 401)

  try {
    const decision = await checkPublicRateLimit(request, 'authenticated-account-reauth', [`user:${authData.user.id}`])
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  if (!authData.user.email) return json({ error: 'reauthentication_unavailable' }, 503)

  const { data: passwordData, error: passwordError } = await supabase.auth.signInWithPassword({
    email: authData.user.email,
    password: input.password,
  })
  if (passwordError || !passwordData.user || passwordData.user.id !== authData.user.id) {
    return json({ error: 'invalid_credentials' }, 401)
  }

  const factorResult = await supabase.auth.mfa.listFactors()
  if (factorResult.error || !factorResult.data) return json({ error: 'reauthentication_unavailable' }, 503)

  const verifiedFactors = factorResult.data.all.filter((factor) => factor.status === 'verified')
  if (verifiedFactors.length > 0) {
    if (!input.mfaCode) return json({ error: 'mfa_required' }, 428)
    if (!(await verifyMfaCode(supabase, verifiedFactors.map((factor) => factor.id), input.mfaCode))) {
      return json({ error: 'invalid_mfa' }, 401)
    }
  }

  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (assurance.error || (verifiedFactors.length > 0 && assurance.data.currentLevel !== 'aal2')) {
    return json({ error: 'mfa_required' }, 428)
  }

  try {
    const confirmation = await issueStepUpConfirmation({
      admin: createSupabaseAdminClient(),
      user: authData.user,
      operation: input.operation,
      assuranceLevel: verifiedFactors.length > 0 ? 'aal2' : 'aal1',
      method: 'password',
    })
    return json({ authenticated: true, expiresAt: confirmation.expiresAt })
  } catch {
    return json({ error: 'reauthentication_unavailable' }, 503)
  }
}

async function verifyMfaCode(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, factorIds: string[], code: string) {
  for (const factorId of factorIds) {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (!error) return true
  }
  return false
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
