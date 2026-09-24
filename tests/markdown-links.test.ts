import { describe, expect, it } from 'vitest'

import { resolveMarkdownUrl, resolveRepositoryRelativePath } from '../lib/viewer/markdown-links'

describe('markdown links', () => {
  it('resolves nested paths relative to the current Markdown file', () => {
    expect(resolveRepositoryRelativePath('docs/setup/README.md', '../architecture.md')).toBe('docs/architecture.md')
    expect(resolveRepositoryRelativePath('docs/setup/README.md', './diagram.png')).toBe('docs/setup/diagram.png')
    expect(resolveRepositoryRelativePath('README.md', 'docs/assets/readme-hero.png')).toBe('docs/assets/readme-hero.png')
    expect(resolveRepositoryRelativePath('README.md', './docs/assets/readme-hero.png')).toBe('docs/assets/readme-hero.png')
    expect(resolveRepositoryRelativePath('docs/setup/README.md', '/docs/assets/readme-hero.png')).toBe('docs/assets/readme-hero.png')
  })

  it('maps repository images to the protected asset route and keeps external HTTPS images external', () => {
    expect(resolveMarkdownUrl({
      url: 'docs/assets/readme-hero.png',
      kind: 'image',
      shareId: 'share-123',
      documentPath: 'README.md',
    })).toEqual({ kind: 'asset', href: '/api/assets/share-123/docs/assets/readme-hero.png' })

    expect(resolveMarkdownUrl({
      url: 'https://example.com/readme-hero.webp',
      kind: 'image',
      shareId: 'share-123',
      documentPath: 'README.md',
    })).toEqual({ kind: 'external', href: 'https://example.com/readme-hero.webp' })
  })

  it('round-trips encoded filenames without treating them as traversal', () => {
    expect(resolveMarkdownUrl({
      url: './API%20Reference.md',
      kind: 'link',
      shareId: 'share-123',
      documentPath: 'docs/README.md',
    })).toEqual({ kind: 'internal-file', href: '/view/share-123/blob/docs/API%20Reference.md' })
  })

  it('rejects traversal that escapes repository root, including encoded traversal', () => {
    expect(resolveRepositoryRelativePath('README.md', '../secrets.txt')).toBeNull()
    expect(resolveRepositoryRelativePath('docs/README.md', '%2e%2e/%2e%2e/secrets.txt')).toBeNull()
    expect(resolveMarkdownUrl({
      url: 'docs/%252e%252e/%252e%252e/secrets.txt',
      kind: 'link',
      shareId: 'share-123',
      documentPath: 'README.md',
    }).kind).toBe('unsafe')
  })

  it('rejects dangerous schemes and keeps HTTP(S) links external', () => {
    expect(resolveMarkdownUrl({ url: 'javascript:alert(1)', kind: 'link', shareId: 'share-123', documentPath: 'README.md' }).kind).toBe('unsafe')
    expect(resolveMarkdownUrl({ url: 'data:text/html,hello', kind: 'image', shareId: 'share-123', documentPath: 'README.md' }).kind).toBe('unsafe')
    expect(resolveMarkdownUrl({ url: 'http://example.com', kind: 'link', shareId: 'share-123', documentPath: 'README.md' }).kind).toBe('external')
    expect(resolveMarkdownUrl({ url: 'https://example.com', kind: 'link', shareId: 'share-123', documentPath: 'README.md' }).kind).toBe('external')
  })
})
