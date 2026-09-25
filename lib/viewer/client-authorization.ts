export class ViewerAuthorizationFailure extends Error {
  readonly code = 'viewer_authorization_failed' as const

  constructor() {
    super('Viewer authorization is no longer valid.')
    this.name = 'ViewerAuthorizationFailure'
  }
}

export class ViewerAuthorizationRevalidationError extends Error {
  readonly code = 'viewer_authorization_unavailable' as const

  constructor() {
    super('Viewer authorization could not be revalidated.')
    this.name = 'ViewerAuthorizationRevalidationError'
  }
}

export function isViewerAuthorizationFailure(error: unknown): error is ViewerAuthorizationFailure | ViewerAuthorizationRevalidationError {
  return error instanceof ViewerAuthorizationFailure || error instanceof ViewerAuthorizationRevalidationError
}

export async function revalidateViewerAuthorization(shareId: string) {
  let response: Response
  try {
    response = await fetch(`/api/view/authorize/${encodeURIComponent(shareId)}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    })
  } catch {
    throw new ViewerAuthorizationRevalidationError()
  }

  if (response.status === 401 || response.status === 403 || response.status === 404) {
    throw new ViewerAuthorizationFailure()
  }
  if (!response.ok) {
    throw new ViewerAuthorizationRevalidationError()
  }
}
