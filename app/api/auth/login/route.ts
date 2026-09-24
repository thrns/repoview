import { NextResponse } from 'next/server'
import { z } from 'zod'

import { checkPublicRateLimit, rateLimitResponse, rateLimitUnavailableResponse } from '../../../../lib/security/rate-limit'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export const runtime = 'nodejs'

const requestSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(1024),
})

export async function POST(request: Request) {
  let input: z.infer<typeof requestSchema>
  try {
    input = requestSchema.parse(await request.json())
  } catch {
    return json({ error: 'invalid_request' }, 400)
  }

  try {
    const decision = await checkPublicRateLimit(request, 'auth-login', [`email:${input.email.toLowerCase()}`])
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password })
    if (error) return json({ error: 'invalid_credentials' }, 401)
    return json({ authenticated: true })
  } catch {
    return json({ error: 'unavailable' }, 503)
  }
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
