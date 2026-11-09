import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { renderSourceCode } from '../components/viewer/source-code-renderer'

describe('source code renderer', () => {
  it('renders syntax-highlighted Supabase theme HTML on the server', async () => {
    const html = await renderSourceCode('const answer = 42', 'src/index.ts')

    expect(html).toContain('Supabase Theme')
    expect(html).toContain('--code-token-keyword')
    expect(html).toContain('class="line"')
    expect(html).toContain('const')
  })

  it('preserves whitespace and escapes source text', async () => {
    const html = await renderSourceCode('  <script>\n\talert(1)\n</script>', 'notes.custom')

    expect(html).toContain('&#x3C;script>')
    expect(html).toContain('alert')
    expect(html).toContain('tabindex="0"')
  })

  it('keeps generated Shiki HTML inside the safe renderer boundary', async () => {
    const html = await renderSourceCode('<script>alert(1)</script>', 'notes.custom')

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('onclick=')
  })

  it('renders supported and unknown source languages with line markup', async () => {
    const files = [
      { filename: 'config.yaml', code: 'apiVersion: v1\nkind: ConfigMap', marker: 'ConfigMap' },
      { filename: 'settings.json', code: '{"enabled": true}', marker: 'enabled' },
      { filename: 'src/index.ts', code: 'const answer: number = 42', marker: 'answer' },
      { filename: 'worker.py', code: 'def answer() -> int:\n    return 42', marker: 'answer' },
      { filename: 'notes.custom', code: 'plain content\n  indented', marker: 'indented' },
    ]

    for (const file of files) {
      const html = await renderSourceCode(file.code, file.filename)
      expect(html).toContain('class="line"')
      expect(html).toContain(file.marker)
    }
  })
})
