import 'server-only'

import { MarkdownAsync } from 'react-markdown'
import type { Components } from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'

import type { ViewerTreeState } from '@/lib/viewer/tree-model'

import { CopyFileButton } from './copy-file-button'
import { MarkdownBlockquote } from './markdown-callout'
import { MarkdownImage } from './markdown-image'
import { MermaidDiagram } from './mermaid-diagram'
import { renderSourceCodeLanguage } from './source-code-renderer'
import { resolveMarkdownUrl } from '../../lib/viewer/markdown-links'

const markdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter((tagName) => tagName !== 'div'),
  attributes: {
    ...defaultSchema.attributes,
    p: [...(defaultSchema.attributes?.p ?? []), 'align'],
    img: [...(defaultSchema.attributes?.img ?? []), 'width'],
  },
}

function createComponents({ shareId, documentPath, tree }: { shareId: string; documentPath: string; tree?: ViewerTreeState }): Components {
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
  code: async (props) => {
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

    const html = await renderSourceCodeLanguage(source, language)

    return (
      <div className="markdown-code-fence">
        <div className="markdown-code-fence-header">
          <span className="font-mono text-xs text-foreground-muted">{language}</span>
          <CopyFileButton content={source} analyticsPath={documentPath} />
        </div>
        <div className="source-code markdown-fenced-source" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    )
  },
  a: (props) => {
    const { href, target, rel, ...rest } = withoutNode(props)
    void target
    void rel
    const resolution = resolveMarkdownUrl({ url: typeof href === 'string' ? href : undefined, kind: 'link', shareId, documentPath, tree })

    if (resolution.kind === 'unsafe') {
      return <span {...rest} className="markdown-link" />
    }

    return (
      <a
        {...rest}
        href={resolution.href}
        className="markdown-link"
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

    // Repository-relative images are rewritten to the protected asset route by
    // resolveMarkdownUrl. That keeps the selected share ref and GitHub App
    // credentials on the server while still allowing external HTTPS images.
    return <MarkdownImage {...rest} src={resolution.href} alt={alt} analyticsPath={documentPath} />
  },
  hr: (props) => <hr {...withoutNode(props)} className="markdown-rule" />,
  }
}

function withoutNode<T extends { node?: unknown }>(props: T) {
  const { node, ...rest } = props
  void node
  return rest
}

export async function MarkdownRenderer({ source, shareId, documentPath, tree }: { source: string; shareId: string; documentPath: string; tree?: ViewerTreeState }) {
  return (
    <article className="markdown-content">
      <MarkdownAsync components={createComponents({ shareId, documentPath, tree })} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSlug, [rehypeSanitize, markdownSanitizeSchema]]}>
        {source}
      </MarkdownAsync>
    </article>
  )
}
