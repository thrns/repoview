import DOMPurify from 'dompurify'

const MERMAID_FORBIDDEN_TAGS = [
  'script',
  'foreignObject',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'link',
  'animate',
  'animateColor',
  'animateMotion',
  'animateTransform',
  'set',
] as const

const MERMAID_FORBIDDEN_ATTRIBUTES = [
  'onabort',
  'onauxclick',
  'onbeforeinput',
  'onbeforetoggle',
  'onblur',
  'oncancel',
  'oncanplay',
  'oncanplaythrough',
  'onchange',
  'onclick',
  'onclose',
  'oncontextmenu',
  'oncopy',
  'oncuechange',
  'oncut',
  'ondblclick',
  'ondrag',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondragstart',
  'ondrop',
  'ondurationchange',
  'onemptied',
  'onended',
  'onerror',
  'onfocus',
  'onformdata',
  'oninput',
  'oninvalid',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onload',
  'onloadeddata',
  'onloadedmetadata',
  'onloadstart',
  'onmousedown',
  'onmouseenter',
  'onmouseleave',
  'onmousemove',
  'onmouseout',
  'onmouseover',
  'onmouseup',
  'onpaste',
  'onpause',
  'onplay',
  'onplaying',
  'onprogress',
  'onratechange',
  'onreset',
  'onscroll',
  'onscrollend',
  'onsecuritypolicyviolation',
  'onseeked',
  'onseeking',
  'onselect',
  'onslotchange',
  'onstalled',
  'onsubmit',
  'onsuspend',
  'ontimeupdate',
  'ontoggle',
  'ontransitioncancel',
  'ontransitionend',
  'ontransitionrun',
  'ontransitionstart',
  'onvolumechange',
  'onwaiting',
  'onwebkitanimationend',
  'onwebkitanimationiteration',
  'onwebkitanimationstart',
  'onwebkittransitionend',
  'onwheel',
] as const

const MERMAID_URL_ATTRIBUTES = new Set([
  'action',
  'background',
  'cite',
  'formaction',
  'href',
  'poster',
  'src',
  'xlink:href',
])

const SAFE_SVG_FRAGMENT = /^#[a-z0-9_.:-]*$/i
const SVG_TAG_PATTERN = /<[^>]*>/g
const SVG_ATTRIBUTE_PATTERN = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
const FORBIDDEN_TAG_PATTERN = /<\s*(?:script|foreignobject|iframe|object|embed|link|animate(?:color|motion|transform)?|set)\b/i

/**
 * The Mermaid result is generated HTML, not a trusted static asset. Keep the
 * library's SVG profile, then apply a narrow postcondition check so a future
 * Mermaid or DOMPurify change fails closed instead of reaching innerHTML.
 */
export function sanitizeMermaidSvg(svg: string): string | null {
  if (typeof window === 'undefined') return null

  const purifier = DOMPurify(window)
  purifier.addHook('uponSanitizeAttribute', (_node, data) => {
    const attributeName = data.attrName.toLowerCase()
    const value = data.attrValue.trim()

    if (
      attributeName.startsWith('on') ||
      (MERMAID_URL_ATTRIBUTES.has(attributeName) && !SAFE_SVG_FRAGMENT.test(value)) ||
      (attributeName === 'style' && hasUnsafeCss(value))
    ) {
      data.keepAttr = false
    }
  })

  const sanitized = purifier.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: [...MERMAID_FORBIDDEN_TAGS],
    FORBID_ATTR: [...MERMAID_FORBIDDEN_ATTRIBUTES],
    ALLOWED_URI_REGEXP: SAFE_SVG_FRAGMENT,
    KEEP_CONTENT: false,
    SAFE_FOR_XML: true,
    SANITIZE_DOM: true,
  })

  return isSafeMermaidSvgMarkup(sanitized) ? sanitized : null
}

/**
 * This check intentionally does not parse or render markup. It is a final
 * fail-closed guard for the exact classes of SVG execution vectors we do not
 * need for Mermaid diagrams.
 */
export function isSafeMermaidSvgMarkup(markup: string): boolean {
  if (!/<\s*svg(?:\s|>)/i.test(markup) || FORBIDDEN_TAG_PATTERN.test(markup)) return false

  for (const tag of markup.match(SVG_TAG_PATTERN) ?? []) {
    for (const match of tag.matchAll(SVG_ATTRIBUTE_PATTERN)) {
      const attributeName = match[1]?.toLowerCase()
      const value = match[2] ?? match[3] ?? match[4] ?? ''
      if (!attributeName) continue

      if (attributeName.startsWith('on')) return false
      if (MERMAID_URL_ATTRIBUTES.has(attributeName) && isDangerousUrl(value)) return false
      if (attributeName === 'style' && hasUnsafeCss(value)) return false
    }
  }

  return !hasUnsafeCssInStyleElements(markup)
}

function isDangerousUrl(value: string) {
  const normalized = value.replace(/[\u0000-\u0020]+/g, '').toLowerCase()
  return normalized.startsWith('javascript:') || normalized.startsWith('data:')
}

function hasUnsafeCss(value: string) {
  const normalized = value.replace(/[\u0000-\u0020]+/g, '').toLowerCase()
  return /(?:url|src)\((?:['"]?)(?:javascript:|data:)/.test(normalized) || /expression\(/.test(normalized) || /@import/.test(normalized)
}

function hasUnsafeCssInStyleElements(markup: string) {
  for (const match of markup.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    if (hasUnsafeCss(match[1] ?? '')) return true
  }

  return false
}
