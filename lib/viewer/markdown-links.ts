import type { ViewerTreeState } from './tree-model'

export type MarkdownResourceKind = 'link' | 'image'

export type MarkdownUrlResolution =
  | { kind: 'internal-file' | 'internal-directory' | 'asset' | 'external' | 'same-document'; href: string }
  | { kind: 'unsafe' }

export function resolveMarkdownUrl({
  url,
  kind,
  shareId,
  documentPath,
  tree,
}: {
  url: string | undefined
  kind: MarkdownResourceKind
  shareId: string
  documentPath: string
  tree?: ViewerTreeState
}): MarkdownUrlResolution {
  if (!url || hasUnsafeCharacters(url)) {
    return { kind: 'unsafe' }
  }

  const target = url.trim()
  if (!target) {
    return { kind: 'unsafe' }
  }

  if (target.startsWith('#') || target.startsWith('?')) {
    return { kind: 'same-document', href: target }
  }

  if (target.startsWith('//')) {
    return { kind: 'unsafe' }
  }

  const scheme = target.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLocaleLowerCase()
  if (scheme) {
    if (scheme !== 'http' && scheme !== 'https') {
      return { kind: 'unsafe' }
    }

    try {
      return { kind: 'external', href: new URL(target).toString() }
    } catch {
      return { kind: 'unsafe' }
    }
  }

  const { path, suffix } = splitTarget(target)
  const resolvedPath = resolveRepositoryRelativePath(documentPath, path)
  if (!resolvedPath) {
    return { kind: 'unsafe' }
  }

  const encodedPath = resolvedPath.split('/').map(encodeURIComponent).join('/')
  const encodedShareId = encodeURIComponent(shareId)
  if (kind === 'image') {
    return { kind: 'asset', href: `/api/assets/${encodedShareId}/${encodedPath}${suffix}` }
  }

  const isDirectory = tree?.status === 'ready'
    ? tree.nodes.some((node) => node.path === resolvedPath && node.kind === 'directory')
    : path.replaceAll('\\', '/').endsWith('/')

  return {
    kind: isDirectory ? 'internal-directory' : 'internal-file',
    href: `/view/${encodedShareId}/${isDirectory ? 'tree' : 'blob'}/${encodedPath}${suffix}`,
  }
}

export function resolveRepositoryRelativePath(documentPath: string, relativePath: string) {
  const currentPath = decodePath(documentPath)
  const targetPath = decodePath(relativePath)
  if (!currentPath || !targetPath) {
    return null
  }

  const normalizedCurrentPath = currentPath.replace(/^\/+/, '').replace(/\/+$/, '')
  const currentSegments = normalizedCurrentPath.split('/').filter(Boolean)
  if (currentSegments.length === 0) {
    return null
  }

  // A leading slash is a repository-root-relative path in GitHub-flavored
  // Markdown. Plain paths remain relative to the Markdown file's directory.
  const segments = targetPath.startsWith('/') ? [] : currentSegments.slice(0, -1)
  for (const segment of targetPath.replace(/^\/+/, '').split('/')) {
    if (segment.length === 0 || segment === '.') {
      continue
    }
    if (segment === '..') {
      if (segments.length === 0) {
        return null
      }
      segments.pop()
      continue
    }
    segments.push(segment)
  }

  const normalizedPath = segments.join('/')
  return normalizedPath && normalizedPath.length <= 512 ? normalizedPath : null
}

function decodePath(value: string) {
  let decoded = value
  try {
    for (let pass = 0; pass < 3; pass += 1) {
      const next = decodeURIComponent(decoded)
      if (next === decoded) {
        break
      }
      decoded = next
    }
  } catch {
    return null
  }

  if (decoded.includes('\0') || /[\u0000-\u001f\u007f]/.test(decoded)) {
    return null
  }

  return decoded.replaceAll('\\', '/')
}

function splitTarget(target: string) {
  const suffixIndex = target.search(/[?#]/)
  if (suffixIndex === -1) {
    return { path: target, suffix: '' }
  }

  return {
    path: target.slice(0, suffixIndex),
    suffix: target.slice(suffixIndex),
  }
}

function hasUnsafeCharacters(value: string) {
  return /[\u0000-\u001f\u007f]/.test(value)
}
