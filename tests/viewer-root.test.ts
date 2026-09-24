import { describe, expect, it } from 'vitest'

import { findRootReadme, isReadmePath } from '../lib/viewer/root-model'
import { buildViewerTree } from '../lib/viewer/tree-model'

describe('viewer root model', () => {
  it('finds case variants of a root README without selecting nested documents', () => {
    const tree = buildViewerTree([
      { path: 'docs/README.md', type: 'blob' },
      { path: 'readme.MARKDOWN', type: 'blob' },
      { path: 'src/index.ts', type: 'blob' },
    ])

    expect(findRootReadme(tree)?.path).toBe('readme.MARKDOWN')
    expect(isReadmePath('README.md')).toBe(true)
    expect(isReadmePath('README.mdx')).toBe(true)
    expect(isReadmePath('docs/README.md')).toBe(false)
  })

  it('returns no README when a repository has no root documentation file', () => {
    expect(findRootReadme(buildViewerTree([{ path: 'src/index.ts', type: 'blob' }]))).toBeNull()
  })
})
