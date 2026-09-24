import {
  DefaultFolderOpenedIcon,
  FileIcon,
  FolderIcon,
} from '@react-symbols/icons/utils'

import type { ViewerTreeNode } from '@/lib/viewer/tree-model'
import { cn } from '@/components/ui/utils'

export function RepositoryFileIcon({ node, expanded = false, className }: { node: ViewerTreeNode; expanded?: boolean; className?: string }) {
  const iconClassName = cn('size-4 shrink-0', className)
  if (node.kind === 'directory') {
    return expanded
      ? <DefaultFolderOpenedIcon width={16} height={16} className={iconClassName} aria-hidden="true" />
      : <FolderIcon folderName={node.name} width={16} height={16} className={iconClassName} aria-hidden="true" />
  }

  return <FileIcon fileName={node.name} autoAssign width={16} height={16} className={iconClassName} aria-hidden="true" />
}
