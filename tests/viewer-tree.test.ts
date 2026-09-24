import { describe, expect, it } from 'vitest'

import { buildViewerTree } from '../lib/viewer/tree-model'

describe('viewer tree model', () => {
  it('creates missing parent directories and sorts folders before files', () => {
    expect(buildViewerTree([
      { path: 'src/zeta.ts', type: 'blob' },
      { path: 'README.md', type: 'blob', size: 120 },
      { path: 'src/components/Button.tsx', type: 'blob' },
      { path: 'src/components', type: 'tree' },
      { path: 'src/alpha.ts', type: 'blob' },
    ])).toEqual([
      { path: 'src', name: 'src', parentPath: null, kind: 'directory', sourceType: 'synthetic-directory' },
      { path: 'src/components', name: 'components', parentPath: 'src', kind: 'directory', sourceType: 'tree' },
      { path: 'src/components/Button.tsx', name: 'Button.tsx', parentPath: 'src/components', kind: 'file', sourceType: 'blob' },
      { path: 'src/alpha.ts', name: 'alpha.ts', parentPath: 'src', kind: 'file', sourceType: 'blob' },
      { path: 'src/zeta.ts', name: 'zeta.ts', parentPath: 'src', kind: 'file', sourceType: 'blob' },
      { path: 'README.md', name: 'README.md', parentPath: null, kind: 'file', sourceType: 'blob', size: 120 },
    ])
  })

  it('treats submodules as selectable file-like entries', () => {
    expect(buildViewerTree([{ path: 'vendor/library', type: 'commit' }])).toEqual([
      { path: 'vendor', name: 'vendor', parentPath: null, kind: 'directory', sourceType: 'synthetic-directory' },
      { path: 'vendor/library', name: 'library', parentPath: 'vendor', kind: 'file', sourceType: 'commit' },
    ])
  })
})
