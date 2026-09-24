import { NextResponse } from 'next/server'
import { z } from 'zod'

import { recordViewerAnalytics } from '@/lib/viewer/analytics-server'
import { VIEWER_ANALYTICS_EVENT_TYPES } from '@/lib/viewer/analytics-types'
import { isGlobalPrivacyControl } from '@/lib/viewer/privacy-shared'

const scalarSchema = z.union([z.string().max(512), z.number().finite(), z.boolean(), z.null()])
const eventSchema = z.object({
  eventType: z.enum(VIEWER_ANALYTICS_EVENT_TYPES),
  path: z.string().trim().max(512).nullable().optional(),
  metadata: z.record(z.string(), scalarSchema).optional(),
  clientSequence: z.number().int().min(0).max(1_000_000).optional(),
})
const contextSchema = z.object({
  deviceType: z.enum(['desktop', 'mobile', 'tablet']).nullable().optional(),
  browser: z.string().max(255).nullable().optional(),
  browserVersion: z.string().max(64).nullable().optional(),
  renderingEngine: z.string().max(255).nullable().optional(),
  os: z.string().max(255).nullable().optional(),
  osVersion: z.string().max(64).nullable().optional(),
  architecture: z.string().max(64).nullable().optional(),
  primaryLanguage: z.string().max(32).nullable().optional(),
  languages: z.array(z.string().max(32)).max(20).optional(),
  browserTimezone: z.string().max(128).nullable().optional(),
  screenWidth: z.number().finite().nullable().optional(),
  screenHeight: z.number().finite().nullable().optional(),
  viewportWidth: z.number().finite().nullable().optional(),
  viewportHeight: z.number().finite().nullable().optional(),
  pixelRatio: z.number().finite().nullable().optional(),
  colorDepth: z.number().finite().nullable().optional(),
  orientation: z.string().max(32).nullable().optional(),
  logicalCpuCount: z.number().finite().nullable().optional(),
  approximateMemoryGb: z.number().finite().nullable().optional(),
  touchCapable: z.boolean().nullable().optional(),
  darkMode: z.boolean().nullable().optional(),
  reducedMotion: z.boolean().nullable().optional(),
})
const snapshotSchema = z.object({
  activeMs: z.number().finite().min(0).max(86_400_000),
  idleMs: z.number().finite().min(0).max(86_400_000),
  entryPath: z.string().trim().max(512).nullable().optional(),
  exitPath: z.string().trim().max(512).nullable().optional(),
  visibilityChanges: z.number().int().min(0).max(100_000),
  focusChanges: z.number().int().min(0).max(100_000),
  ended: z.boolean().optional(),
})
const requestSchema = z.object({
  shareId: z.string().uuid().or(z.string().regex(/^[A-Za-z0-9_-]{8}$/)),
  events: z.array(eventSchema).max(50),
  clientContext: contextSchema.optional(),
  session: snapshotSchema.optional(),
})

export async function POST(request: Request) {
  let input: z.infer<typeof requestSchema>
  try {
    input = requestSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const result = await recordViewerAnalytics(input, { gpcApplied: isGlobalPrivacyControl(request.headers.get('sec-gpc')) })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }
}
