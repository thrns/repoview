import { NextResponse } from 'next/server'

import { getServerEnv } from '@/lib/env/server'
import {
  parseGitHubWebhookPayload,
  processGitHubWebhookDelivery,
  verifyGitHubWebhookSignature,
} from '@/lib/github/webhooks'
import { isRequestBodyTooLarge, readRequestBody } from '../../../../lib/security/body-limit'

export const runtime = 'nodejs'

// GitHub documents a 25 MB webhook payload cap. Keep a small unit conversion
// margin so legitimate GitHub deliveries are not rejected by RepoView.
const MAX_GITHUB_WEBHOOK_BODY_BYTES = 26 * 1024 * 1024

export async function POST(request: Request) {
  // Read the body exactly once and verify that exact string before parsing it.
  let rawBody: string
  try {
    rawBody = await readRequestBody(request, MAX_GITHUB_WEBHOOK_BODY_BYTES)
  } catch (error) {
    if (isRequestBodyTooLarge(error)) return json({ error: 'Webhook payload is too large.' }, 413)
    return json({ error: 'Webhook payload could not be read.' }, 400)
  }
  const signature = request.headers.get('x-hub-signature-256')
  const secret = getServerEnv().GITHUB_WEBHOOK_SECRET

  if (!verifyGitHubWebhookSignature(rawBody, signature, secret)) {
    return json({ error: 'Invalid webhook signature.' }, 401)
  }

  const deliveryId = request.headers.get('x-github-delivery')?.trim()
  const event = request.headers.get('x-github-event')?.trim()
  if (!deliveryId || !event) {
    return json({ error: 'GitHub webhook headers are incomplete.' }, 400)
  }

  let payload: ReturnType<typeof parseGitHubWebhookPayload>
  try {
    payload = parseGitHubWebhookPayload(rawBody)
  } catch {
    return json({ error: 'GitHub webhook payload is invalid.' }, 400)
  }

  try {
    const result = await processGitHubWebhookDelivery({ deliveryId, event, payload })
    return json(result, 200)
  } catch {
    // A non-2xx response tells GitHub to retry after the delivery is marked
    // failed. The response intentionally contains no provider or database data.
    return json({ error: 'GitHub webhook processing failed.' }, 500)
  }
}

function json(body: unknown, status: number) {
  const response = NextResponse.json(body, { status })
  response.headers.set('Cache-Control', 'no-store')
  return response
}
