import { describe, expect, it } from 'vitest'

import { isSafeMermaidSvgMarkup, sanitizeMermaidSvg } from '../lib/viewer/mermaid-sanitize'

describe('Mermaid SVG sanitization', () => {
  const maliciousFixtures = [
    '<svg><script>alert(1)</script><path /></svg>',
    '<svg><foreignObject><div onclick="alert(1)">unsafe HTML</div></foreignObject></svg>',
    '<svg><path onclick="alert(1)" onload="alert(2)" /></svg>',
    '<svg><a href="javascript:alert(1)"><text>click</text></a></svg>',
    '<svg><image href="data:image/svg+xml,<svg onload=alert(1)>" /></svg>',
    '<svg><style>.node { background: url(javascript:alert(1)) }</style></svg>',
  ]

  it.each(maliciousFixtures)('rejects generated SVG execution vector: %s', (fixture) => {
    expect(isSafeMermaidSvgMarkup(fixture)).toBe(false)
  })

  it('accepts a normal Mermaid SVG with internal fragment references', () => {
    expect(isSafeMermaidSvgMarkup('<svg><defs><marker id="arrow" /></defs><path marker-end="url(#arrow)" /></svg>')).toBe(true)
  })

  it('accepts Mermaid foreignObject labels and dominant-baseline', () => {
    expect(isSafeMermaidSvgMarkup('<svg viewBox="0 0 100 40"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml" dominant-baseline="central">Label</div></foreignObject><text dominant-baseline="central">Text</text></svg>')).toBe(true)
  })

  it('fails closed when sanitization cannot run outside a browser DOM', () => {
    expect(sanitizeMermaidSvg('<svg><path /></svg>')).toBeNull()
  })
})
