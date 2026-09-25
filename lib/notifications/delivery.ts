import 'server-only'

import { randomUUID } from 'node:crypto'

import { createSupabaseAdminClient } from '../supabase/admin'
import type { Json, Tables } from '../supabase/database.types'
import { sendTransactionalEmail, TransactionalEmailProviderError, type TransactionalEmail } from './email-provider'
import { QuotaExceededError, releaseQuota, reserveQuota } from '../security/quotas'

const MAX_ATTEMPTS = 5
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000]

export type QueueNotificationInput = {
  workspaceId: string
  shareId: string
  sessionId: string
  recipient: string
  notificationKind: 'view_opened' | 'session_summary'
  idempotencyKey: string
  email: TransactionalEmail
  payload?: Json
}

export type QueueNotificationResult =
  | { status: 'queued'; deliveryId: string }
  | { status: 'already-queued' }
  | { status: 'quota-exceeded'; message: string }

export async function queueNotificationDelivery(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  input: QueueNotificationInput,
): Promise<QueueNotificationResult> {
  let reservation
  try {
    reservation = await reserveQuota(
      'notification-emails-workspace-daily',
      input.workspaceId,
      'workspace',
      1,
      new Date(),
      admin,
    )
  } catch (error) {
    if (error instanceof QuotaExceededError) return { status: 'quota-exceeded', message: error.message }
    throw error
  }

  const payload = {
    ...(isRecord(input.payload) ? input.payload : {}),
    email: input.email,
  } as Json
  const { data, error } = await admin.from('notification_deliveries').upsert({
    workspace_id: input.workspaceId,
    share_id: input.shareId,
    session_id: input.sessionId,
    channel: 'email',
    recipient: input.recipient,
    notification_kind: input.notificationKind,
    status: 'pending',
    attempt_count: 0,
    provider_message_id: null,
    last_error: null,
    next_retry_at: null,
    outbound_attempt_key: randomUUID(),
    outbound_attempt_started_at: null,
    idempotency_key: input.idempotencyKey,
    payload,
    sent_at: null,
  } as never, { onConflict: 'idempotency_key', ignoreDuplicates: true }).select('id').maybeSingle()

  if (error) {
    await releaseQuota(reservation, admin)
    throw error
  }
  if (!data) {
    await releaseQuota(reservation, admin)
    return { status: 'already-queued' }
  }
  return { status: 'queued', deliveryId: data.id }
}

export type NotificationDispatchResult =
  | { status: 'sent'; deliveryId: string }
  | { status: 'retryable'; deliveryId: string; nextRetryAt: string }
  | { status: 'permanent'; deliveryId: string }
  | { status: 'cancelled' | 'provider_result_unknown'; deliveryId: string }
  | { status: 'not-due' | 'missing'; deliveryId: string }

export async function dispatchNotificationDelivery(
  deliveryId: string,
  admin = createSupabaseAdminClient(),
  now = new Date(),
): Promise<NotificationDispatchResult> {
  const { data: claimedData, error: claimError } = await admin.rpc('claim_notification_delivery', {
    target_delivery_id: deliveryId,
    target_now: now.toISOString(),
  })
  if (claimError) throw claimError
  const delivery = firstRow(claimedData)
  if (!delivery) return { status: 'not-due', deliveryId }
  if (delivery.status === 'cancelled') return { status: 'cancelled', deliveryId }
  if (delivery.status === 'provider_result_unknown') return { status: 'provider_result_unknown', deliveryId }
  if (delivery.status !== 'processing') return { status: 'not-due', deliveryId }

  const email = extractEmail(delivery.payload)
  if (!email) {
    await markPermanentFailure(admin, deliveryId, 'Notification message is unavailable.')
    return { status: 'permanent', deliveryId }
  }

  try {
    const result = await sendTransactionalEmail(email, { idempotencyKey: delivery.outbound_attempt_key })
    const { data: sentDelivery, error } = await admin.from('notification_deliveries').update({
      status: 'sent',
      provider_message_id: result.providerMessageId,
      last_error: null,
      next_retry_at: null,
      sent_at: now.toISOString(),
    }).eq('id', deliveryId).eq('status', 'processing').eq('outbound_attempt_key', delivery.outbound_attempt_key).select('id').maybeSingle()
    if (error || !sentDelivery) {
      await markProviderResultUnknown(admin, deliveryId, error)
      return { status: 'provider_result_unknown', deliveryId }
    }
    return { status: 'sent', deliveryId }
  } catch (error) {
    if (error instanceof TransactionalEmailProviderError && error.outcomeUnknown) {
      await markProviderResultUnknown(admin, deliveryId, error)
      return { status: 'provider_result_unknown', deliveryId }
    }
    const retryable = error instanceof TransactionalEmailProviderError ? error.retryable : true
    const attemptCount = Number(delivery.attempt_count ?? 0)
    const shouldRetry = retryable && attemptCount < MAX_ATTEMPTS
    const nextRetryAt = shouldRetry ? new Date(now.getTime() + (RETRY_DELAYS_MS[attemptCount - 1] ?? RETRY_DELAYS_MS.at(-1)!)).toISOString() : null
    const status = shouldRetry ? 'retryable' : 'permanent'
    const { error: updateError } = await admin.from('notification_deliveries').update({
      status,
      last_error: safeErrorMessage(error),
      next_retry_at: nextRetryAt,
    }).eq('id', deliveryId).eq('status', 'processing').eq('outbound_attempt_key', delivery.outbound_attempt_key)
    if (updateError) {
      await markProviderResultUnknown(admin, deliveryId, updateError)
      return { status: 'provider_result_unknown', deliveryId }
    }
    return shouldRetry
      ? { status: 'retryable', deliveryId, nextRetryAt: nextRetryAt! }
      : { status: 'permanent', deliveryId }
  }
}

export async function dispatchPendingNotificationDeliveries(
  limit = 25,
  admin = createSupabaseAdminClient(),
  now = new Date(),
) {
  const { data: deliveries, error } = await admin
    .from('notification_deliveries')
    .select('id')
    .in('status', ['pending', 'retryable', 'processing'])
    .or(`next_retry_at.is.null,next_retry_at.lte.${now.toISOString()}`)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error

  const results = []
  for (const delivery of deliveries ?? []) {
    results.push(await dispatchNotificationDelivery(delivery.id, admin, now))
  }
  return results
}

async function markPermanentFailure(admin: ReturnType<typeof createSupabaseAdminClient>, deliveryId: string, message: string) {
  const { error } = await admin.from('notification_deliveries').update({
    status: 'permanent',
    last_error: message,
    next_retry_at: null,
  }).eq('id', deliveryId).eq('status', 'processing')
  if (error) throw error
}

async function markProviderResultUnknown(admin: ReturnType<typeof createSupabaseAdminClient>, deliveryId: string, cause: unknown) {
  // This update is deliberately best-effort. If the database connection died
  // after the provider call, the persisted outbound_attempt_started_at makes
  // the next claim fail closed once its processing lease expires.
  await admin.from('notification_deliveries').update({
    status: 'provider_result_unknown',
    last_error: safeUnknownErrorMessage(cause),
    next_retry_at: null,
  }).eq('id', deliveryId).eq('status', 'processing')
}

function firstRow(value: unknown): Tables<'notification_deliveries'> | null {
  if (Array.isArray(value)) return (value[0] as Tables<'notification_deliveries'> | undefined) ?? null
  return value && typeof value === 'object' ? value as Tables<'notification_deliveries'> : null
}

function extractEmail(payload: unknown): TransactionalEmail | null {
  if (!isRecord(payload) || !isRecord(payload.email)) return null
  const email = payload.email
  if (typeof email.to !== 'string' || typeof email.subject !== 'string' || typeof email.text !== 'string') return null
  return {
    to: email.to,
    subject: email.subject,
    text: email.text,
    ...(typeof email.html === 'string' ? { html: email.html } : {}),
  }
}

function safeErrorMessage(error: unknown) {
  return error instanceof TransactionalEmailProviderError ? error.message : 'Transactional email delivery failed.'
}

function safeUnknownErrorMessage(error: unknown) {
  if (error instanceof TransactionalEmailProviderError) return error.outcomeUnknown ? 'Provider result is unknown; manual reconciliation is required.' : error.message
  return 'Provider result is unknown; manual reconciliation is required.'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
