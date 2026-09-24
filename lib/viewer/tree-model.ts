export type ViewerTreeNodeKind = 'directory' | 'file'

export interface ViewerTreeEntry {
  path: string
  type: 'blob' | 'tree' | 'commit'
  size?: number
}

export interface ViewerTreeNode {
  path: string
  name: string
  parentPath: string | null
  kind: ViewerTreeNodeKind
  sourceType: ViewerTreeEntry['type'] | 'synthetic-directory'
  size?: number
}

export type ViewerTreeState =
  | { status: 'ready'; nodes: ViewerTreeNode[] }
  | { status: 'error'; reason: 'truncated' | 'ref-unavailable' | 'rate-limited' | 'access' | 'unavailable' }

export function buildViewerTree(entries: ViewerTreeEntry[]): ViewerTreeNode[] {
  const nodes = new Map<string, ViewerTreeNode>()

  for (const entry of entries) {
    const path = entry.path.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '')
    if (!path) {
      continue
    }

    const segments = path.split('/')
    for (let index = 1; index < segments.length; index += 1) {
      const parentPath = segments.slice(0, index).join('/')
      if (!nodes.has(parentPath)) {
        nodes.set(parentPath, createNode(parentPath, 'directory', 'synthetic-directory'))
      }
    }

    const kind = entry.type === 'tree' ? 'directory' : 'file'
    const existing = nodes.get(path)
    nodes.set(path, {
      ...createNode(path, kind, entry.type),
      ...(entry.size === undefined ? {} : { size: entry.size }),
      ...(existing?.kind === 'directory' && kind === 'file' ? { kind: 'directory' as const } : {}),
    })
  }

  return flattenNodes([...nodes.values()])
}

function createNode(
  path: string,
  kind: ViewerTreeNodeKind,
  sourceType: ViewerTreeNode['sourceType'],
): ViewerTreeNode {
  const separatorIndex = path.lastIndexOf('/')
  return {
    path,
    name: separatorIndex === -1 ? path : path.slice(separatorIndex + 1),
    parentPath: separatorIndex === -1 ? null : path.slice(0, separatorIndex),
    kind,
    sourceType,
  }
}

function flattenNodes(nodes: ViewerTreeNode[]) {
  const childrenByParent = new Map<string | null, ViewerTreeNode[]>()
  const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

  for (const node of nodes) {
    const children = childrenByParent.get(node.parentPath) ?? []
    children.push(node)
    childrenByParent.set(node.parentPath, children)
  }

  for (const children of childrenByParent.values()) {
    children.sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === 'directory' ? -1 : 1
      }

      return collator.compare(left.name, right.name) || collator.compare(left.path, right.path)
    })
  }

  const flattened: ViewerTreeNode[] = []
  const visit = (parentPath: string | null) => {
    for (const node of childrenByParent.get(parentPath) ?? []) {
      flattened.push(node)
      if (node.kind === 'directory') {
        visit(node.path)
      }
    }
  }

  visit(null)
  return flattened
}
