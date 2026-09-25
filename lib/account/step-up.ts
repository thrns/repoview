import 'server-only'

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

import { cookies } from 'next/headers'

import type { SupabaseClient, User } from '@supabase/supabase-js'

import { getServerEnv } from '../env/server'
import type { Database } from '../supabase/database.types'

export const ACCOUNT_STEP_UP_COOKIE = 'repoview_account_step_up'
export const ACCOUNT_STEP_UP_MAX_AGE_SECONDS = 5 * 60
export const ACCOUNT_REAUTH_STATE_COOKIE = 'repoview_account_reauth_state'
export const ACCOUNT_REAUTH_PENDING_COOKIE = 'repoview_account_reauth_pending'

export type AccountStepUpOperation = 'account-delete' | 'account-export'
export type AccountStepUpAssurance = 'aal1' | 'aal2'
export type AccountStepUpMethod = 'password' | 'google'

export type AccountReauthState = {
  state: string
  userId: string
  operation: AccountStepUpOperation
  expiresAt: number
}

export type AccountReauthPending = {
  userId: string
  operation: AccountStepUpOperation
  method: AccountStepUpMethod
  expiresAt: number
}

export class StepUpConfirmationUnavailableError extends Error {
  constructor() {
    super('Recent authentication confirmation is temporarily unavailable.')
    this.name = 'StepUpConfirmationUnavailableError'
  }
}

export async function issueStepUpConfirmation({
  admin,
  user,
  operation,
  assuranceLevel,
  method,
}: {
  admin: SupabaseClient<Database>
  user: Pick<User, 'id'>
  operation: AccountStepUpOperation
  assuranceLevel: AccountStepUpAssurance
  method: AccountStepUpMethod
}) {
  const rawToken = randomBytes(32).toString('base64url')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ACCOUNT_STEP_UP_MAX_AGE_SECONDS * 1000).toISOString()

  const { error } = await admin.from('account_step_up_confirmations').insert({
    user_id: user.id,
    operation,
    token_hash: hashStepUpToken(rawToken),
    assurance_level: assuranceLevel,
    authentication_method: method,
    issued_at: now.toISOString(),
    expires_at: expiresAt,
  })

  if (error) throw new StepUpConfirmationUnavailableError()

  const cookieStore = await cookies()
  cookieStore.set(ACCOUNT_STEP_UP_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/api/account',
    maxAge: ACCOUNT_STEP_UP_MAX_AGE_SECONDS,
  })

  return { expiresAt }
}

/**
 * Consume the confirmation before a sensitive operation mutates or exports
 * anything. The update is conditional so a replayed cookie cannot succeed.
 */
export async function consumeStepUpConfirmation({
  admin,
  userId,
  operation,
}: {
  admin: SupabaseClient<Database>
  userId: string
  operation: AccountStepUpOperation
}) {
  const cookieStore = await cookies()
  const rawToken = cookieStore.get(ACCOUNT_STEP_UP_COOKIE)?.value
  if (!rawToken || rawToken.length < 32) return false

  const { data, error } = await admin
    .from('account_step_up_confirmations')
    .update({ consumed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('operation', operation)
    .eq('token_hash', hashStepUpToken(rawToken))
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('id')

  if (error) throw new StepUpConfirmationUnavailableError()
  if (!data || data.length !== 1) return false

  clearStepUpCookie(cookieStore)
  return true
}

export function hashStepUpToken(rawToken: string) {
  return createHash('sha256').update(`repoview-step-up:${rawToken}`, 'utf8').digest('hex')
}

export async function setAccountReauthState(state: AccountReauthState) {
  const cookieStore = await cookies()
  cookieStore.set(ACCOUNT_REAUTH_STATE_COOKIE, signPayload(state), reauthCookieOptions(10 * 60))
}

export async function consumeAccountReauthState(expectedState: string) {
  const cookieStore = await cookies()
  const payload = verifyPayload<AccountReauthState>(cookieStore.get(ACCOUNT_REAUTH_STATE_COOKIE)?.value)
  clearCookie(cookieStore, ACCOUNT_REAUTH_STATE_COOKIE)
  if (!payload || payload.state !== expectedState || payload.expiresAt <= Math.floor(Date.now() / 1000)) return null
  return payload
}

export async function setAccountReauthPending(pending: AccountReauthPending) {
  const cookieStore = await cookies()
  cookieStore.set(ACCOUNT_REAUTH_PENDING_COOKIE, signPayload(pending), reauthCookieOptions(10 * 60))
}

export async function readAccountReauthPending() {
  const cookieStore = await cookies()
  return verifyPayload<AccountReauthPending>(cookieStore.get(ACCOUNT_REAUTH_PENDING_COOKIE)?.value)
}

export async function clearAccountReauthPending() {
  const cookieStore = await cookies()
  clearCookie(cookieStore, ACCOUNT_REAUTH_PENDING_COOKIE)
}

export function clearStepUpCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  clearCookie(cookieStore, ACCOUNT_STEP_UP_COOKIE)
}

function reauthCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/api/account',
    maxAge,
  }
}

function clearCookie(cookieStore: Awaited<ReturnType<typeof cookies>>, name: string) {
  cookieStore.set(name, '', reauthCookieOptions(0))
}

function signPayload(payload: object) {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = createHmac('sha256', getServerEnv().SUPABASE_SERVICE_ROLE_KEY).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

function verifyPayload<T>(value: string | undefined) {
  if (!value) return null
  const [encoded, signature] = value.split('.')
  if (!encoded || !signature) return null

  const expected = createHmac('sha256', getServerEnv().SUPABASE_SERVICE_ROLE_KEY).update(encoded).digest('base64url')
  const receivedBytes = Buffer.from(signature)
  const expectedBytes = Buffer.from(expected)
  if (receivedBytes.length !== expectedBytes.length || !timingSafeEqual(receivedBytes, expectedBytes)) return null

  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}
