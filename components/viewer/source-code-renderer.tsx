import 'server-only'

import { codeToHtml, type BundledLanguage } from 'shiki'

import { detectViewerLanguage } from '../../lib/viewer/language'

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
    return await codeToHtml(code, {
      lang: bundledLanguage,
      themes: SHIKI_THEMES,
    })
  } catch {
    return codeToHtml(code, {
      lang: 'text' as BundledLanguage,
      themes: SHIKI_THEMES,
    })
  }
}

export async function SourceCodeRenderer({ code, filename }: { code: string; filename: string }) {
  const html = await renderSourceCode(code, filename)

  return <div className="source-code" dangerouslySetInnerHTML={{ __html: html }} />
}
