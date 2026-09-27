export type ShareErrorReason = 'invalid' | 'expired' | 'revoked' | 'repository_unavailable' | 'ref_unavailable' | 'unavailable'

const shareErrors: Record<ShareErrorReason, { title: string; description: string }> = {
  invalid: {
    title: 'This link is not available',
    description: 'The share link may be incorrect or no longer exists. Ask the owner to verify the URL or issue a new share.',
  },
  expired: {
    title: 'This link has expired',
    description: 'Ask the owner for a new share link if you still need access.',
  },
  revoked: {
    title: 'This link has been revoked',
    description: 'The owner has stopped this share from being accessed.',
  },
  repository_unavailable: {
    title: 'Repository unavailable',
    description: 'This repository or its connected access is no longer available. Ask the owner to restore access or issue a new share.',
  },
  ref_unavailable: {
    title: 'Source ref unavailable',
    description: 'The selected branch or ref is no longer available. Ask the owner to verify the ref or issue a new share.',
  },
  unavailable: {
    title: 'This share is temporarily unavailable',
    description: 'Try again later. If the problem continues, ask the owner to check the share configuration.',
  },
}

export function getShareError(reason: string | undefined) {
  return shareErrors[isShareErrorReason(reason) ? reason : 'unavailable']
}

function isShareErrorReason(reason: string | undefined): reason is ShareErrorReason {
  return reason !== undefined && reason in shareErrors
}
