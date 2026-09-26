// @vitest-environment jsdom

import { beforeAll, describe, expect, it } from 'vitest'
import mermaid from 'mermaid'

import { sanitizeMermaidSvg } from '../lib/viewer/mermaid-sanitize'

const fixtures = [
  {
    name: 'flowchart',
    chart: 'flowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Done]',
    nodeSelector: '.node',
    expectedText: ['Start', 'Decision', 'Done'],
  },
  {
    name: 'sequence diagram',
    chart: 'sequenceDiagram\n  participant Alice\n  participant Bob\n  Alice->>Bob: Hello Bob',
    nodeSelector: '.actor',
    expectedText: ['Alice', 'Bob', 'Hello Bob'],
  },
  {
    name: 'ER diagram',
    chart: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  CUSTOMER {\n    string id\n    string name\n  }',
    nodeSelector: '.node',
    expectedText: ['CUSTOMER', 'ORDER', 'name'],
  },
  {
    name: 'multiline Markdown labels',
    chart: 'flowchart TD\n  A["**Ready**<br/>Line two"] --> B[Deploy]',
    nodeSelector: '.node',
    expectedText: ['**Ready**', 'Line two', 'Deploy'],
  },
] as const

describe('Mermaid SVG sanitization integration', () => {
  beforeAll(() => {
    Object.defineProperty(window.SVGElement.prototype, 'getBBox', {
      configurable: true,
      value() {
        return {
          x: 0,
          y: 0,
          width: Math.max(40, (this.textContent?.length ?? 0) * 8),
          height: 24,
        }
      },
    })

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: 'base',
      layout: 'dagre',
      flowchart: {
        htmlLabels: true,
      },
    })
  })

  it.each(fixtures)('preserves real $name output after sanitization', async ({ name, chart, nodeSelector, expectedText }) => {
    const result = await mermaid.render(`sanitize-integration-${name.replace(/[^a-z0-9]+/gi, '-')}`, chart)
    expect(result.svg).toMatch(/^<svg[\s>]/i)

    const sanitized = sanitizeMermaidSvg(result.svg)
    expect(sanitized).not.toBeNull()

    const originalMount = document.createElement('div')
    originalMount.innerHTML = result.svg
    const originalSvg = originalMount.querySelector('svg')

    const mount = document.createElement('div')
    mount.innerHTML = sanitized ?? ''
    document.body.append(mount)

    const svg = mount.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.querySelectorAll(nodeSelector).length).toBeGreaterThan(0)
    expect(svg?.getAttribute('viewBox')).toBeTruthy()
    expect(svg?.querySelector('defs')).not.toBeNull()
    expect(svg?.querySelector('marker')).not.toBeNull()
    expect(svg?.querySelector('[transform]')).not.toBeNull()
    for (const selector of ['text', 'tspan', 'foreignObject']) {
      if ((originalSvg?.querySelectorAll(selector).length ?? 0) > 0) {
        expect(svg?.querySelectorAll(selector).length).toBeGreaterThan(0)
      }
    }

    const renderedText = svg?.textContent ?? ''
    for (const expected of expectedText) {
      expect(renderedText).toContain(expected)
    }

    mount.remove()
  })

  it('keeps foreignObject labels from strict Mermaid output', async () => {
    const result = await mermaid.render('sanitize-integration-foreignobject', 'flowchart TD\n  A["**Ready**<br/>Line two"]')
    expect(result.svg).toMatch(/<foreignobject/i)

    const sanitized = sanitizeMermaidSvg(result.svg)
    expect(sanitized).not.toBeNull()
    expect(sanitized).toMatch(/<foreignobject/i)
    expect(sanitized).toContain('Line two')
  })

  it('removes execution vectors inside HTML-integrated labels', () => {
    const sanitized = sanitizeMermaidSvg('<svg><foreignObject><div onclick="alert(1)">Safe label</div></foreignObject><a href="javascript:alert(1)"><text>Unsafe link</text></a><script>alert(1)</script></svg>')

    expect(sanitized).not.toBeNull()
    expect(sanitized).toContain('Safe label')
    expect(sanitized).not.toContain('onclick')
    expect(sanitized).not.toContain('javascript:')
    expect(sanitized).not.toContain('<script')
  })
})
