import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AccountDeletionError, deleteAccountData } from '@/lib/account/deletion'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  confirmation: z.string().trim().min(1).max(400),
})

export async function POST(request: Request) {
  let input: z.infer<typeof requestSchema>
  try {
    input = requestSchema.parse(await request.json())
  } catch {
    return response({ error: 'invalid_request' }, 400)
  }

  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return response({ error: 'authentication_required' }, 401)

  try {
    await deleteAccountData({ user: authData.user, confirmation: input.confirmation })
    await supabase.auth.signOut({ scope: 'local' })
    return response({ deleted: true })
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      const status = error.code === 'cleanup_failed' ? 500 : error.code === 'workspace_has_members' ? 409 : 400
      return response({ error: error.code }, status)
    }
    return response({ error: 'cleanup_failed' }, 500)
  }
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
