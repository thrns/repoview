import type { ViewerTreeNode } from './tree-model'

export interface ViewerReadme {
  path: string
  size: number
  content: string
}

export type ViewerRootState =
  | { status: 'ready'; readme: ViewerReadme | null }
  | { status: 'unavailable'; reason: 'tree' | 'ref-unavailable' | 'rate-limited' | 'access' | 'binary' | 'oversized' | 'unavailable' }

export function findRootReadme(nodes: ViewerTreeNode[]) {
  return nodes.find((node) => node.kind === 'file' && node.parentPath === null && isReadmePath(node.path)) ?? null
}

export function isReadmePath(path: string) {
  return /^readme(?:\.md|\.markdown|\.mdx)?$/i.test(path)
}
