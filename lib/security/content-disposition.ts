const MAX_FILENAME_UTF8_BYTES = 180
const DEFAULT_FILENAME = 'download.txt'

/** Build a safe attachment header from a basename, never a path. */
export function buildAttachmentContentDisposition(basename: string) {
  const safeName = truncateUtf8Bytes(
    replaceInvalidSurrogates(basename.normalize('NFC')).replace(/[\u0000-\u001f\u007f-\u009f]/g, '_').trim(),
    MAX_FILENAME_UTF8_BYTES,
  ) || DEFAULT_FILENAME

  const asciiFallback = safeName.replace(/[^A-Za-z0-9._ -]/g, '_').trim() || DEFAULT_FILENAME
  const quotedFallback = asciiFallback.replace(/["\\]/g, '\\$&')
  const encodedName = encodeURIComponent(safeName).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)

  return `attachment; filename="${quotedFallback}"; filename*=UTF-8''${encodedName}`
}

function truncateUtf8Bytes(value: string, maxBytes: number) {
  let bytes = 0
  let result = ''

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0
    const characterBytes = codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4
    if (bytes + characterBytes > maxBytes) break
    result += character
    bytes += characterBytes
  }

  return result
}

function replaceInvalidSurrogates(value: string) {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return codePoint >= 0xd800 && codePoint <= 0xdfff ? '\ufffd' : character
  }).join('')
}
