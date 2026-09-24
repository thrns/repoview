export type ShareErrorReason = 'invalid' | 'expired' | 'revoked' | 'repository_unavailable' | 'ref_unavailable' | 'unavailable'

const shareErrors: Record<ShareErrorReason, { title: string; description: string }> = {
  invalid: {
    title: 'This link is not available',
    description: 'The share link may be incorrect or no longer exists.',
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
    description: 'This private repository is no longer available for this share.',
  },
  ref_unavailable: {
    title: 'Source ref unavailable',
    description: 'The selected branch or ref is no longer available.',
  },
  unavailable: {
    title: 'This share is temporarily unavailable',
    description: 'Please try again later or ask the owner to check the share configuration.',
  },
}

export function getShareError(reason: string | undefined) {
  return shareErrors[isShareErrorReason(reason) ? reason : 'unavailable']
}

function isShareErrorReason(reason: string | undefined): reason is ShareErrorReason {
  return reason !== undefined && reason in shareErrors
}
