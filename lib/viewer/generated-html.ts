const UNSAFE_TAG_PATTERN = /<\s*(?:script|iframe|object|embed|foreignobject)\b/i
const UNSAFE_EVENT_ATTRIBUTE_PATTERN = /<[^>]*\s+on[a-z0-9:_-]+\s*=/i
const UNSAFE_URL_ATTRIBUTE_PATTERN = /<[^>]*\s+(?:href|xlink:href|src)\s*=\s*["']\s*(?:javascript:|data:)/i

/**
 * Shiki escapes source text before producing its HTML. Keep a small
 * postcondition here so every raw HTML sink has an explicit trust boundary if
 * the highlighter output changes in a future upgrade.
 */
export function isSafeGeneratedHtml(html: string) {
  return !UNSAFE_TAG_PATTERN.test(html) && !UNSAFE_EVENT_ATTRIBUTE_PATTERN.test(html) && !UNSAFE_URL_ATTRIBUTE_PATTERN.test(html)
}

export function safeGeneratedHtml(html: string) {
  return isSafeGeneratedHtml(html) ? html : null
}
