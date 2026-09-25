import 'server-only'

import { codeToHtml, type BundledLanguage } from 'shiki'

import { detectViewerLanguage } from '../../lib/viewer/language'
import { safeGeneratedHtml } from '../../lib/viewer/generated-html'

const SHIKI_THEMES = {
  light: 'github-light-default',
  dark: 'github-dark-default',
} as const

export async function renderSourceCode(code: string, filename: string) {
  return renderSourceCodeLanguage(code, detectViewerLanguage(filename))
}

export async function renderSourceCodeLanguage(code: string, language: string) {
  const bundledLanguage = language as BundledLanguage

  try {
    const html = await codeToHtml(code, {
      lang: bundledLanguage,
      themes: SHIKI_THEMES,
    })
    return safeGeneratedHtml(html) ?? renderPlainSource(code)
  } catch {
    const html = await codeToHtml(code, {
      lang: 'text' as BundledLanguage,
      themes: SHIKI_THEMES,
    })
    return safeGeneratedHtml(html) ?? renderPlainSource(code)
  }
}

export async function SourceCodeRenderer({ code, filename }: { code: string; filename: string }) {
  const html = await renderSourceCode(code, filename)

  return <div className="source-code" dangerouslySetInnerHTML={{ __html: html }} />
}

function renderPlainSource(code: string) {
  return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}
