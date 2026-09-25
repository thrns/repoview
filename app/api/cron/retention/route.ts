import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { getServerEnv } from '../../../../lib/env/server'
import { RETENTION_BATCH_SIZE } from '../../../../lib/retention-policy'
import { runRetentionCleanup } from '../../../../lib/retention/cleanup'
import { createSupabaseAdminClient } from '../../../../lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

  const admin = createSupabaseAdminClient()
  const startedAt = new Date().toISOString()
  const { data: runRecord, error: startError } = await admin.from('retention_cleanup_runs').insert({
    job_name: 'retention',
    status: 'running',
    batch_limit: RETENTION_BATCH_SIZE,
    rows_processed: 0,
    details: {},
    started_at: startedAt,
  }).select('id').single()

  if (startError || !runRecord) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const summary = await runRetentionCleanup({ admin, now: new Date(startedAt) })
    const { error: finishError } = await admin.from('retention_cleanup_runs').update({
      status: 'succeeded',
      rows_processed: summary.totalProcessed,
      details: summary,
      completed_at: new Date().toISOString(),
      error: null,
    }).eq('id', runRecord.id)
    if (finishError) throw finishError
    return NextResponse.json({ ok: true, ...summary }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    await admin.from('retention_cleanup_runs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error: 'retention_cleanup_failed',
      details: { failure_code: 'retention_cleanup_failed' },
    }).eq('id', runRecord.id)
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}

function isAuthorized(request: Request) {
  const secret = getServerEnv().CRON_SECRET
  const authorization = request.headers.get('authorization') ?? ''
  const provided = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : ''
  if (!secret || !provided) return false
  const expectedBytes = Buffer.from(secret)
  const providedBytes = Buffer.from(provided)
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes)
}
