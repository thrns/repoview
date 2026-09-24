import { NextResponse } from 'next/server'

import { getServerEnv } from '../../../../../lib/env/server'
import { dispatchPendingNotificationDeliveries } from '../../../../../lib/notifications/delivery'

export async function POST(request: Request) {
  const secret = getServerEnv().NOTIFICATION_DISPATCH_SECRET
  const authorization = request.headers.get('authorization')
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const results = await dispatchPendingNotificationDeliveries()
    return NextResponse.json({ processed: results.length }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
