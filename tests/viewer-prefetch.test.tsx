// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

import { ViewerFileTree } from '../components/viewer/viewer-file-tree'
import { buildViewerTree } from '../lib/viewer/tree-model'

describe('viewer intent prefetch', () => {
  let container: HTMLDivElement
  let root: Root | null = null

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
  })

  afterEach(() => {
    if (root) {
      act(() => root?.unmount())
      root = null
    }
    container.remove()
    vi.unstubAllGlobals()
  })

  it('keeps hover and keyboard focus prefetch on file rows', async () => {
    const prefetch = vi.fn()
    await act(async () => {
      root = createRoot(container)
      root.render(
        <ViewerFileTree
          tree={{ status: 'ready', nodes: buildViewerTree([{ path: 'index.ts', type: 'blob' }]) }}
          selectedPath={null}
          onSelectPath={vi.fn()}
          onPrefetchPath={prefetch}
        />,
      )
    })

    const fileRow = container.querySelector<HTMLButtonElement>('button[title="index.ts"]')
    expect(fileRow).not.toBeNull()

    await act(async () => {
      fileRow?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }))
    })
    expect(prefetch).toHaveBeenCalledWith('index.ts')

    prefetch.mockClear()
    await act(async () => fileRow?.focus())
    expect(prefetch).toHaveBeenCalledWith('index.ts')
  })

  it('removes automatic first-four-file prefetch while retaining lazy preview loading', () => {
    const shell = readFileSync('components/viewer/viewer-shell.tsx', 'utf8')

    expect(shell).not.toMatch(/\.slice\(\s*0\s*,\s*4\s*\)/)
    expect(shell).not.toContain('candidates.forEach(prefetchPath)')
    expect(shell).toContain("void import('./viewer-file-content')")
  })
})
