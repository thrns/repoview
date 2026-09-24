'use client'

import Markdown from 'react-markdown'
import type { Components } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'

import { Skeleton } from '@/components/ui'
import { resolveMarkdownUrl } from '@/lib/viewer/markdown-links'
import type { ViewerTreeState } from '@/lib/viewer/tree-model'

import { ClientSourceCodeRenderer } from './client-source-code-renderer'
import { CopyFileButton } from './copy-file-button'
import { MarkdownBlockquote } from './markdown-callout'
import { MarkdownImage } from './markdown-image'
import { MermaidDiagram } from './mermaid-diagram'

const markdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter((tagName) => tagName !== 'div'),
  attributes: {
    ...defaultSchema.attributes,
    p: [...(defaultSchema.attributes?.p ?? []), 'align'],
    img: [...(defaultSchema.attributes?.img ?? []), 'width'],
  },
}

export function MarkdownRendererClient({ source, shareId, documentPath, tree, onOpenPath }: { source: string; shareId: string; documentPath: string; tree?: ViewerTreeState; onOpenPath?: (path: string) => void }) {
  const [readySource, setReadySource] = useState<string | null>(null)
  const components = useMemo(() => createComponents({ shareId, documentPath, tree, onOpenPath }), [documentPath, onOpenPath, shareId, tree])
  const markdown = useMemo(() => (
    <Markdown components={components} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSlug, [rehypeSanitize, markdownSanitizeSchema]]}>
      {source}
    </Markdown>
  ), [components, source])

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (!cancelled) setReadySource(source)
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [source])

  if (readySource !== source) {
    return <MarkdownSkeleton />
  }

  return (
    <article className="markdown-content">
      {markdown}
    </article>
  )
}

function MarkdownSkeleton() {
  return (
    <article className="markdown-content space-y-5" aria-busy="true" aria-label="Rendering Markdown">
      <Skeleton className="h-10 w-3/4" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <Skeleton className="h-7 w-1/2" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-10/12" />
      </div>
      <div className="space-y-3 rounded-xl border border-border p-5">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </article>
  )
}

function createComponents({ shareId, documentPath, tree, onOpenPath }: { shareId: string; documentPath: string; tree?: ViewerTreeState; onOpenPath?: (path: string) => void }): Components {
  return {
    h1: (props) => <h1 {...withoutNode(props)} className="markdown-heading" />,
    h2: (props) => <h2 {...withoutNode(props)} className="markdown-heading" />,
    h3: (props) => <h3 {...withoutNode(props)} className="markdown-heading" />,
    h4: (props) => <h4 {...withoutNode(props)} className="markdown-heading" />,
    p: (props) => <p {...withoutNode(props)} className="markdown-paragraph" />,
    blockquote: (props) => <MarkdownBlockquote {...withoutNode(props)} />,
    ul: (props) => {
      const { className, ...rest } = withoutNode(props)
      return <ul {...rest} className={`markdown-list ${className ?? ''}`.trim()} />
    },
    ol: (props) => {
      const { className, ...rest } = withoutNode(props)
      return <ol {...rest} className={`markdown-list ${className ?? ''}`.trim()} />
    },
    li: (props) => {
      const { className, ...rest } = withoutNode(props)
      return <li {...rest} className={`markdown-list-item ${className ?? ''}`.trim()} />
    },
    input: (props) => {
      const { type, ...rest } = withoutNode(props)
      return <input {...rest} type={type ?? 'checkbox'} className="markdown-task-checkbox" disabled />
    },
    table: (props) => <div className="markdown-table-scroll"><table {...withoutNode(props)} /></div>,
    thead: (props) => <thead {...withoutNode(props)} className="markdown-table-head" />,
    th: (props) => <th {...withoutNode(props)} className="markdown-table-cell markdown-table-header" />,
    td: (props) => <td {...withoutNode(props)} className="markdown-table-cell" />,
    pre: (props) => <>{withoutNode(props).children}</>,
    code: (props) => {
      const { className, children, ...rest } = withoutNode(props)
      if (!className) {
        return <code {...rest} className="markdown-inline-code">{children}</code>
      }

      const language = className.match(/language-([\w-]+)/)?.[1] ?? 'text'
      const source = String(children).replace(/\n$/, '')

      if (language.toLocaleLowerCase() === 'mermaid') {
        return (
          <div className="markdown-code-fence markdown-mermaid-fence">
            <div className="markdown-code-fence-header">
              <span className="font-mono text-xs text-foreground-muted">mermaid</span>
              <CopyFileButton content={source} analyticsPath={documentPath} />
            </div>
            <MermaidDiagram chart={source} analyticsPath={documentPath} />
          </div>
        )
      }

      return (
        <div className="markdown-code-fence">
          <div className="markdown-code-fence-header">
            <span className="font-mono text-xs text-foreground-muted">{language}</span>
            <CopyFileButton content={source} analyticsPath={documentPath} />
          </div>
          <ClientSourceCodeRenderer code={source} filename={`file.${language}`} />
        </div>
      )
    },
    a: (props) => {
      const { href, target, rel, ...rest } = withoutNode(props)
      void target
      void rel
      const resolution = resolveMarkdownUrl({ url: typeof href === 'string' ? href : undefined, kind: 'link', shareId, documentPath, tree })
      const internalPath = resolution.kind === 'internal-file' ? getInternalPath(resolution.href, shareId) : null
      const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (!internalPath || !onOpenPath || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        onOpenPath(internalPath)
      }

      if (resolution.kind === 'unsafe') {
        return <span {...rest} className="markdown-link" />
      }

      return (
        <a
          {...rest}
          href={resolution.href}
          className="markdown-link"
          onClick={handleClick}
          {...(resolution.kind === 'external' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        />
      )
    },
    img: (props) => {
      const { src, alt, ...rest } = withoutNode(props)
      const resolution = resolveMarkdownUrl({ url: typeof src === 'string' ? src : undefined, kind: 'image', shareId, documentPath, tree })

      if (resolution.kind === 'unsafe' || resolution.kind === 'same-document') {
        return <span {...rest} className="markdown-image-placeholder" role="img" aria-label={alt || 'Image unavailable'}>{alt || 'Image unavailable'}</span>
      }

      return <MarkdownImage {...rest} src={resolution.href} alt={alt} analyticsPath={documentPath} />
    },
    hr: (props) => <hr {...withoutNode(props)} className="markdown-rule" />,
  }
}


function getInternalPath(href: string, shareId: string) {
  const marker = `/view/${encodeURIComponent(shareId)}/blob/`
  if (!href.startsWith(marker)) return null
  const encodedPath = href.slice(marker.length).split(/[?#]/, 1)[0]
  try {
    return encodedPath.split('/').map((segment) => decodeURIComponent(segment)).join('/')
  } catch {
    return null
  }
}

function withoutNode<T extends { node?: unknown }>(props: T) {
  const { node, ...rest } = props
  void node
  return rest
}
