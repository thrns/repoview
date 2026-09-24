import { AlertTriangle, Info, Lightbulb, OctagonAlert, TriangleAlert } from 'lucide-react'
import { cloneElement, isValidElement, type HTMLAttributes, type ReactNode } from 'react'

type CalloutKind = 'note' | 'tip' | 'important' | 'warning' | 'caution'

export function MarkdownBlockquote({ children, ...props }: HTMLAttributes<HTMLElement> & { children?: ReactNode }) {
  const match = toText(children).trim().match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i)
  if (!match) {
    return <blockquote {...props} className="markdown-blockquote">{children}</blockquote>
  }

  const kind = match[1].toLowerCase() as CalloutKind
  return (
    <aside className={`markdown-callout markdown-callout-${kind}`} role="note">
      <div className="markdown-callout-label">
        <CalloutIcon kind={kind} />
        <span>{kind}</span>
      </div>
      <div className="markdown-callout-content">{stripMarker(children, match[0])}</div>
    </aside>
  )
}

function CalloutIcon({ kind }: { kind: CalloutKind }) {
  const Icon = kind === 'tip'
    ? Lightbulb
    : kind === 'important'
      ? OctagonAlert
      : kind === 'warning'
        ? TriangleAlert
        : kind === 'caution'
          ? AlertTriangle
          : Info
  return <Icon className="size-4" aria-hidden="true" />
}

function stripMarker(node: ReactNode, marker: string): ReactNode {
  if (typeof node === 'string') {
    return node.replace(marker, '').replace(/^\s+/, '')
  }
  if (Array.isArray(node)) {
    return node.map((child) => stripMarker(child, marker))
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return cloneElement(node, undefined, stripMarker(node.props.children, marker))
  }
  return node
}

function toText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(toText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return toText(node.props.children)
  return ''
}
