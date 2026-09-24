import { renderToReadableStream } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { MarkdownRenderer } from '../components/viewer/markdown-renderer'
import { buildViewerTree } from '../lib/viewer/tree-model'

describe('markdown renderer', () => {
  const tree = {
    status: 'ready' as const,
    nodes: buildViewerTree([
      { path: 'docs/architecture.md', type: 'blob' },
      { path: 'docs/components/Button.tsx', type: 'blob' },
    ]),
  }
  const render = async (source: string) => new Response(await renderToReadableStream(await MarkdownRenderer({
    source,
    shareId: 'share-123',
    documentPath: 'docs/setup/README.md',
    tree,
  }))).text()
  const renderRoot = async (source: string) => new Response(await renderToReadableStream(await MarkdownRenderer({
    source,
    shareId: 'share-123',
    documentPath: 'README.md',
    tree,
  }))).text()

  it('renders plain Markdown and GFM content with slugged headings', async () => {
    const html = await render('# Hello\n\n- one\n- two\n\n- [x] done\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n~~old~~')

    expect(html).toContain('id="user-content-hello"')
    expect(html).toContain('markdown-list')
    expect(html).toContain('markdown-task-checkbox')
    expect(html).toContain('markdown-table-scroll')
    expect(html).toContain('<del>old</del>')
  })

  it('renders GitHub-style alerts as semantic callouts', async () => {
    const html = await render('> [!WARNING]\n> Check the repository visibility before sharing.')

    expect(html).toContain('markdown-callout markdown-callout-warning')
    expect(html).toContain('markdown-callout-label')
    expect(html).toContain('Check the repository visibility before sharing.')
    expect(html).not.toContain('[!WARNING]')
  })

  it('does not render raw HTML from untrusted Markdown', async () => {
    const html = await render('# Safe\n\n<script>alert(1)</script>')

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('alert(1)')
  })

  it('renders fenced code through the server Shiki surface with a copy control', async () => {
    const html = await render('```ts\nconst answer = 42\n```')

    expect(html).toContain('source-code')
    expect(html).toContain('github-dark-default')
    expect(html).toContain('Copy file')
  })

  it('resolves nested internal links, protected images, safe external links, and strips dangerous targets', async () => {
    const html = await render('[Architecture](../architecture.md) [Components](../components/) [Bad](javascript:alert(1)) ![Diagram](./diagram.png) [External](https://example.com/docs)')

    expect(html).toContain('href="/view/share-123/blob/docs/architecture.md"')
    expect(html).toContain('href="/view/share-123/tree/docs/components"')
    expect(html).toContain('src="/api/assets/share-123/docs/setup/diagram.png"')
    expect(html).toContain('href="https://example.com/docs"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).not.toContain('javascript:')
  })

  it('renders a root README image from a repository-relative path through the protected asset route', async () => {
    const html = await renderRoot('![tracebox system map](docs/assets/readme-hero.png)\n\n![External preview](https://example.com/readme-hero.webp)')

    expect(html).toContain('<img')
    expect(html).toContain('src="/api/assets/share-123/docs/assets/readme-hero.png"')
    expect(html).toContain('alt="tracebox system map"')
    expect(html).toContain('src="https://example.com/readme-hero.webp"')
    expect(html).toContain('alt="External preview"')
    expect(html).toContain('class="markdown-image"')
    expect(html).not.toContain('![tracebox system map](docs/assets/readme-hero.png)')
  })

  it('renders GitHub-style HTML image blocks alongside Markdown images', async () => {
    const html = await renderRoot('<p align="center">\n  <img src="docs/assets/readme-hero.png" alt="Tekkscope system map" width="100%" />\n</p>')

    expect(html).toContain('<p align="center"')
    expect(html).toContain('src="/api/assets/share-123/docs/assets/readme-hero.png"')
    expect(html).toContain('alt="Tekkscope system map"')
    expect(html).toContain('width="100%"')
    expect(html).toContain('class="markdown-image"')
  })

  it('renders a realistic README fixture with publication-quality GFM and document links', async () => {
    const html = await render(`# RepoView\n\nA short README with \`inline code\`.\n\n- one\n  - nested item\n- two\n\n- [x] ship the preview\n- [ ] review the share\n\n| Language | Status |\n| --- | --- |\n| TypeScript | ready |\n\n\`\`\`ts\nexport const answer: number = 42\n\`\`\`\n\n\`\`\`python\nprint('hello')\n\`\`\`\n\n\`\`\`json\n{\"ready\": true}\n\`\`\`\n\n![Architecture diagram](./diagram.png)\n\nSee [the architecture guide](../architecture.md) or [the public docs](https://example.com/docs).\n\n<div>safe fallback</div>`)

    expect(html).toContain('id="user-content-repoview"')
    expect(html).toContain('markdown-inline-code')
    expect(html).toContain('markdown-list')
    expect(html).toContain('markdown-task-checkbox')
    expect(html).toContain('markdown-table-scroll')
    expect(html.match(/class="markdown-code-fence"/g)?.length).toBe(3)
    expect(html).toContain('src="/api/assets/share-123/docs/setup/diagram.png"')
    expect(html).toContain('href="/view/share-123/blob/docs/architecture.md"')
    expect(html).toContain('href="https://example.com/docs"')
    expect(html).not.toContain('<div>safe fallback</div>')
  })
})
