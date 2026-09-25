import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AccountDeletionError, deleteAccountData } from '@/lib/account/deletion'
import { getAccountDeletionConfirmation } from '@/lib/account/deletion-shared'
import { consumeStepUpConfirmation, StepUpConfirmationUnavailableError } from '@/lib/account/step-up'
import { isAllowedRequestOrigin } from '@/lib/security/origin'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  confirmation: z.string().trim().min(1).max(400),
})

export async function POST(request: Request) {
  if (!isAllowedRequestOrigin(request)) return response({ error: 'invalid_origin' }, 403)

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
    if (input.confirmation.trim() !== getAccountDeletionConfirmation(authData.user.email)) {
      return response({ error: 'confirmation_required' }, 400)
    }

    const stepUpConfirmed = await consumeStepUpConfirmation({
      admin: createSupabaseAdminClient(),
      userId: authData.user.id,
      operation: 'account-delete',
    })
    if (!stepUpConfirmed) return response({ error: 'recent_auth_required' }, 401)

    const deletion = await deleteAccountData({ user: authData.user, confirmation: input.confirmation, stepUpConfirmed })
    await supabase.auth.signOut({ scope: 'local' })
    return response({ queued: true, jobId: deletion.jobId }, 202)
  } catch (error) {
    if (error instanceof StepUpConfirmationUnavailableError) return response({ error: 'reauthentication_unavailable' }, 503)
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
