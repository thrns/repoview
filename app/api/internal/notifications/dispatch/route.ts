import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { getServerEnv } from '../../../../../lib/env/server'
import { dispatchPendingNotificationDeliveries } from '../../../../../lib/notifications/delivery'
import { logViewerDiagnostic } from '../../../../../lib/viewer/diagnostics'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: Request) {
  return run(request)
}

export async function POST(request: Request) {
  return run(request)
}

async function run(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const results = await dispatchPendingNotificationDeliveries()
    return NextResponse.json({ processed: results.length }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    logViewerDiagnostic('viewer-notification-dispatcher-failed', { reason: 'pending-delivery-dispatch-failed' })
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}

function isAuthorized(request: Request) {
  const env = getServerEnv()
  const authorization = request.headers.get('authorization') ?? ''
  const provided = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : ''
  if (!provided) return false

  return [env.NOTIFICATION_DISPATCH_SECRET, env.CRON_SECRET]
    .filter((secret): secret is string => Boolean(secret))
    .some((secret) => {
      const expectedBytes = Buffer.from(secret)
      const providedBytes = Buffer.from(provided)
      return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes)
    })
}
