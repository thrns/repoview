import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getPublicEnv } from '../../../../lib/env/public'
import { checkPublicRateLimit, rateLimitResponse, rateLimitUnavailableResponse } from '../../../../lib/security/rate-limit'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export const runtime = 'nodejs'

const requestSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
  password: z.string().min(6).max(1024),
})

export async function POST(request: Request) {
  let input: z.infer<typeof requestSchema>
  try {
    input = requestSchema.parse(await request.json())
  } catch {
    return json({ error: 'invalid_request' }, 400)
  }

  try {
    const decision = await checkPublicRateLimit(request, 'auth-signup', [`email:${input.email.toLowerCase()}`])
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  try {
    const supabase = await createSupabaseServerClient()
    const env = getPublicEnv()
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.fullName },
        emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/auth/callback?next=/onboarding`,
      },
    })
    if (error) return json({ error: error.message.toLowerCase().includes('rate limit') ? 'rate_limited' : 'signup_failed' }, 400)
    return json({ authenticated: Boolean(data.session) })
  } catch {
    return json({ error: 'unavailable' }, 503)
  }
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
