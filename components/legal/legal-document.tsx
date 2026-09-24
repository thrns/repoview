import Link from 'next/link'
import Markdown from 'react-markdown'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

import { BrandLogo } from '@/components/shared/brand-logo'
import type { LegalSection } from '@/lib/legal-content'

import { LegalSidebar } from './legal-sidebar'

const markdownComponents: Components = {
  h1: (props) => <h1 {...withoutNode(props)} className="markdown-heading" />,
  h2: (props) => <h2 {...withoutNode(props)} className="markdown-heading" />,
  h3: (props) => <h3 {...withoutNode(props)} className="markdown-heading" />,
  h4: (props) => <h4 {...withoutNode(props)} className="markdown-heading" />,
  p: (props) => <p {...withoutNode(props)} className="markdown-paragraph" />,
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
  a: (props) => <a {...withoutNode(props)} className="markdown-link" />,
  table: (props) => <div className="markdown-table-scroll"><table {...withoutNode(props)} /></div>,
  thead: (props) => <thead {...withoutNode(props)} className="markdown-table-head" />,
  th: (props) => <th {...withoutNode(props)} className="markdown-table-cell markdown-table-header" />,
  td: (props) => <td {...withoutNode(props)} className="markdown-table-cell" />,
  hr: (props) => <hr {...withoutNode(props)} className="markdown-rule" />,
}

function withoutNode<T extends { node?: unknown }>(props: T) {
  const { node, ...rest } = props
  void node
  return rest
}

export function LegalDocument({ content, sections }: { content: string; sections: LegalSection[] }) {
  return (
    <main className="legal-page min-h-screen bg-background text-foreground">
      <header className="legal-header">
        <div className="legal-header-inner">
          <Link href="/" className="legal-brand" aria-label="RepoView home">
            <BrandLogo size={28} />
            <span>RepoView</span>
          </Link>
          <nav aria-label="Legal pages" className="legal-top-nav">
            <Link href="/privacy" className="legal-top-link">Privacy</Link>
            <Link href="/terms" className="legal-top-link">Terms</Link>
          </nav>
        </div>
      </header>
      <div className="legal-layout">
        <LegalSidebar sections={sections} />
        <article className="legal-article markdown-content">
          <Markdown components={markdownComponents} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
            {content}
          </Markdown>
        </article>
      </div>
    </main>
  )
}
