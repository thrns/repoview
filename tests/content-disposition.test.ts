import { describe, expect, it } from 'vitest'

import { buildAttachmentContentDisposition } from '../lib/security/content-disposition'

function encodedFilename(header: string) {
  const match = header.match(/filename\*=UTF-8''([^;]+)/)
  expect(match).not.toBeNull()
  return decodeURIComponent(match?.[1] ?? '')
}

describe('buildAttachmentContentDisposition', () => {
  it('emits a quoted fallback and RFC 5987 filename for normal names', () => {
    expect(buildAttachmentContentDisposition('README.md')).toBe('attachment; filename="README.md"; filename*=UTF-8\'\'README.md')
  })

  it('safely encodes quotes and backslashes', () => {
    const header = buildAttachmentContentDisposition('read"me\\notes.md')

    expect(header).toContain('filename="read_me_notes.md"')
    expect(encodedFilename(header)).toBe('read"me\\notes.md')
    expect(header).toContain("filename*=UTF-8''read%22me%5Cnotes.md")
    expect(header).not.toContain('read"me')
  })

  it('replaces CR/LF and other control characters before building the header', () => {
    const header = buildAttachmentContentDisposition('read\r\nme\u0000.md')

    expect(header).not.toMatch(/[\r\n\u0000]/)
    expect(header).toContain('filename="read__me_.md"')
    expect(encodedFilename(header)).toBe('read__me_.md')
  })

  it('preserves Unicode in filename* and provides an ASCII fallback', () => {
    const header = buildAttachmentContentDisposition('café-日本語.md')

    expect(header).toContain('filename="caf_-___.md"')
    expect(encodedFilename(header)).toBe('café-日本語.md')
  })

  it('uses a default name for empty basenames', () => {
    expect(buildAttachmentContentDisposition('')).toBe('attachment; filename="download.txt"; filename*=UTF-8\'\'download.txt')
  })

  it('limits the Unicode filename to a reasonable UTF-8 byte length', () => {
    const header = buildAttachmentContentDisposition(`${'界'.repeat(400)}.md`)
    const filename = encodedFilename(header)

    expect(new TextEncoder().encode(filename).byteLength).toBeLessThanOrEqual(180)
  })
})
