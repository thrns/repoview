import 'server-only'

import { createSupabaseAdminClient } from '../supabase/admin'
import type { Json } from '../supabase/database.types'
import { sendTransactionalEmail, TransactionalEmailProviderError, type TransactionalEmail } from './email-provider'

const MAX_ATTEMPTS = 5
const PROCESSING_LEASE_MS = 5 * 60_000
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

export async function queueNotificationDelivery(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  input: QueueNotificationInput,
): Promise<QueueNotificationResult> {
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
    idempotency_key: input.idempotencyKey,
    payload,
    sent_at: null,
  } as never, { onConflict: 'idempotency_key', ignoreDuplicates: true }).select('id').maybeSingle()

  if (error) throw error
  return data ? { status: 'queued', deliveryId: data.id } : { status: 'already-queued' }
}

export type NotificationDispatchResult =
  | { status: 'sent'; deliveryId: string }
  | { status: 'retryable'; deliveryId: string; nextRetryAt: string }
  | { status: 'permanent'; deliveryId: string }
  | { status: 'not-due' | 'missing'; deliveryId: string }

export async function dispatchNotificationDelivery(
  deliveryId: string,
  admin = createSupabaseAdminClient(),
  now = new Date(),
): Promise<NotificationDispatchResult> {
  const leaseUntil = new Date(now.getTime() + PROCESSING_LEASE_MS).toISOString()
  const { data: delivery, error: claimError } = await admin
    .from('notification_deliveries')
    .update({ status: 'processing', next_retry_at: leaseUntil })
    .eq('id', deliveryId)
    .in('status', ['pending', 'retryable', 'processing'])
    .or(`next_retry_at.is.null,next_retry_at.lte.${now.toISOString()}`)
    .select('*')
    .maybeSingle()

  if (claimError) throw claimError
  if (!delivery) return { status: 'not-due', deliveryId }

  const attemptCount = Number(delivery.attempt_count ?? 0) + 1
  const { error: attemptError } = await admin
    .from('notification_deliveries')
    .update({ attempt_count: attemptCount })
    .eq('id', deliveryId)
    .eq('status', 'processing')
  if (attemptError) throw attemptError

  const email = extractEmail(delivery.payload)
  if (!email) {
    await markPermanentFailure(admin, deliveryId, 'Notification message is unavailable.')
    return { status: 'permanent', deliveryId }
  }

  try {
    const result = await sendTransactionalEmail(email)
    const { error } = await admin.from('notification_deliveries').update({
      status: 'sent',
      provider_message_id: result.providerMessageId,
      last_error: null,
      next_retry_at: null,
      sent_at: now.toISOString(),
    }).eq('id', deliveryId).eq('status', 'processing')
    if (error) throw error
    return { status: 'sent', deliveryId }
  } catch (error) {
    const retryable = error instanceof TransactionalEmailProviderError ? error.retryable : true
    const shouldRetry = retryable && attemptCount < MAX_ATTEMPTS
    const nextRetryAt = shouldRetry ? new Date(now.getTime() + (RETRY_DELAYS_MS[attemptCount - 1] ?? RETRY_DELAYS_MS.at(-1)!)).toISOString() : null
    const status = shouldRetry ? 'retryable' : 'permanent'
    const { error: updateError } = await admin.from('notification_deliveries').update({
      status,
      last_error: safeErrorMessage(error),
      next_retry_at: nextRetryAt,
    }).eq('id', deliveryId).eq('status', 'processing')
    if (updateError) throw updateError
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
