import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../supabase/migrations/20260924190000_minimize_viewer_analytics.sql', import.meta.url), 'utf8')
const inventory = readFileSync(new URL('../docs/viewer-analytics-data-inventory.md', import.meta.url), 'utf8')

describe('viewer analytics minimization migration', () => {
  it('removes raw and fingerprint-like fields from persistent analytics tables', () => {
    for (const field of ['public_ip', 'postal_area', 'approximate_latitude', 'approximate_longitude', 'logical_cpu_count', 'approximate_memory_gb', 'device_profile_hash', 'network_key_hash', 'idle_ms', 'max_scroll_percent']) {
      expect(migration).toContain(`drop column if exists ${field}`)
    }
    expect(migration).toContain('add column if not exists ip_hash text')
    expect(migration).not.toContain('add column if not exists public_ip')
  })

  it('documents the purpose and classification of retained collection', () => {
    expect(inventory).toContain('| `ip_hash` | Rate limiting and security correlation | Necessary |')
    expect(inventory).toContain('| Browser family, OS family, device category | Useful owner-facing viewing context | Optional |')
    expect(inventory).toContain('search text is not stored')
    expect(inventory).toContain('screen/viewport size')
  })
})
