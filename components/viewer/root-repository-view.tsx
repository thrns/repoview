import type { ViewerRootState } from '@/lib/viewer/root-model'
import type { ViewerTreeState } from '@/lib/viewer/tree-model'

import { ViewerFilePreview } from './viewer-file-preview'

export function RootRepositoryView({ shareId, tree, root, allowDownload }: { shareId: string; tree: ViewerTreeState; root: ViewerRootState; allowDownload?: boolean }) {
  if (root.status === 'ready' && root.readme) {
    return <ViewerFilePreview file={{ kind: 'text', ...root.readme }} shareId={shareId} tree={tree} allowDownload={allowDownload} />
  }

  return <RootEmptyState root={root} />
}

function RootEmptyState({ root }: { root: ViewerRootState }) {
  const message = root.status === 'ready'
    ? 'This repository does not include a root README.md file.'
    : readmeUnavailableMessage(root.reason)

  return (
    <section className="repository-file-page min-h-[calc(100vh-3rem)]">
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="font-heading text-lg font-semibold">README.md unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-foreground-muted">{message}</p>
      </div>
    </section>
  )
}

function readmeUnavailableMessage(reason: Extract<ViewerRootState, { status: 'unavailable' }>['reason']) {
  if (reason === 'binary') return 'The README is not a text preview.'
  if (reason === 'oversized') return 'The README is too large for an inline preview.'
  if (reason === 'ref-unavailable') return 'The selected branch or ref is no longer available.'
  if (reason === 'rate-limited') return 'GitHub’s file service is rate-limited. Try again later.'
  if (reason === 'access') return 'The configured GitHub App can no longer read this repository.'
  return 'The README preview is temporarily unavailable.'
}
