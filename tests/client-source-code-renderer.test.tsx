// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { codeToHtmlMock } = vi.hoisted(() => ({ codeToHtmlMock: vi.fn() }))
vi.mock('shiki', () => ({ codeToHtml: codeToHtmlMock }))

import { ClientSourceCodeRenderer } from '../components/viewer/client-source-code-renderer'

const sourceFiles = [
  { filename: 'backend/k8s/configmap.yaml', code: 'apiVersion: v1\nkind: ConfigMap\ndata:\n  LOG_LEVEL: info', language: 'yaml' },
  { filename: 'settings.json', code: '{"enabled": true, "count": 3}', language: 'json' },
  { filename: 'src/index.ts', code: 'export const answer: number = 42', language: 'typescript' },
  { filename: 'scripts/process.py', code: 'def process(value: str) -> str:\n    return value.strip()', language: 'python' },
  { filename: 'notes.custom', code: 'unknown\ttext\n  stays visible', language: 'text' },
]

describe('client source code renderer', () => {
  let container: HTMLDivElement
  let root: Root | null = null

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
    codeToHtmlMock.mockReset()
  })

  afterEach(() => {
    if (root) {
      act(() => root?.unmount())
      root = null
    }
    container.remove()
    vi.unstubAllGlobals()
  })

  it('renders YAML, JSON, TypeScript, Python, and unknown text files during navigation', async () => {
    codeToHtmlMock.mockImplementation((code: string, options: { lang: string }) => {
      const lines = code.split('\n').map((line) => `<span class="line">${escapeHtml(line)}</span>`).join('')
      return Promise.resolve(`<pre class="shiki" data-language="${options.lang}"><code>${lines}</code></pre>`)
    })

    for (const file of sourceFiles) {
      await act(async () => {
        if (!root) root = createRoot(container)
        root.render(<ClientSourceCodeRenderer code={file.code} filename={file.filename} />)
      })
      await act(async () => vi.waitFor(() => {
        const renderedLines = container.querySelectorAll('.source-code .line')
        const rendered = Array.from(renderedLines, (line) => line.textContent ?? '').join('\n')
        expect(rendered).toContain(file.code)
      }, { timeout: 10_000 }))

      expect(container.querySelector('.source-code .shiki')?.getAttribute('data-language')).toBe(file.language)
      expect(container.querySelector('.source-code .line')).not.toBeNull()
      expect(container.textContent).not.toContain('Unable to render this file preview.')
    }

    expect(codeToHtmlMock).toHaveBeenCalledTimes(sourceFiles.length)
  })
})

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}
