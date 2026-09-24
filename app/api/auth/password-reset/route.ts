import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getPublicEnv } from '../../../../lib/env/public'
import { checkPublicRateLimit, rateLimitResponse, rateLimitUnavailableResponse } from '../../../../lib/security/rate-limit'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export const runtime = 'nodejs'

const requestSchema = z.object({ email: z.string().trim().email().max(320) })

export async function POST(request: Request) {
  let input: z.infer<typeof requestSchema>
  try {
    input = requestSchema.parse(await request.json())
  } catch {
    return json({ error: 'invalid_request' }, 400)
  }

  try {
    const decision = await checkPublicRateLimit(request, 'auth-password-reset', [`email:${input.email.toLowerCase()}`])
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  // Supabase Auth applies its own email/provider protections. This route adds
  // an application bucket without revealing whether the address is registered.
  try {
    const supabase = await createSupabaseServerClient()
    const env = getPublicEnv()
    await supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/auth/callback?next=/login`,
    })
  } catch {
    // Keep the response deliberately generic to avoid account enumeration.
  }
  return json({ sent: true })
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
