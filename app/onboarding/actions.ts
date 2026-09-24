'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireUser } from '@/lib/auth/workspace'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
  acceptTerms: z.literal(true),
  acknowledgePrivacy: z.literal(true),
})

export async function completeOnboardingProfile(input: unknown) {
  const parsed = profileSchema.parse(input)
  await requireUser()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('complete_profile', {
    target_full_name: parsed.fullName,
  })

  if (error) {
    throw new Error('RepoView could not save your profile. Please try again.')
  }

  revalidatePath('/onboarding')
  revalidatePath('/dashboard')
  return { saved: true as const }
}
