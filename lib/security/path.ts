export const MAX_REPOSITORY_PATH_LENGTH = 512

export function normalizeRepositoryPath(path: unknown) {
  if (typeof path !== 'string' || path.length > MAX_REPOSITORY_PATH_LENGTH) {
    return null
  }

  let decodedPath = path
  try {
    // Decode repeatedly so double-encoded traversal cannot survive into a GitHub request.
    for (let pass = 0; pass < 3; pass += 1) {
      const nextPath = decodeURIComponent(decodedPath)
      if (nextPath === decodedPath) {
        break
      }
      decodedPath = nextPath
    }
  } catch {
    return null
  }

  if (decodedPath.length > MAX_REPOSITORY_PATH_LENGTH || decodedPath.includes('\0')) {
    return null
  }

  const segments: string[] = []
  for (const segment of decodedPath.replaceAll('\\', '/').split('/')) {
    if (segment.length === 0 || segment === '.') {
      continue
    }
    if (segment === '..') {
      return null
    }
    segments.push(segment)
  }

  const normalizedPath = segments.join('/')
  return normalizedPath.length > 0 ? normalizedPath : null
}
