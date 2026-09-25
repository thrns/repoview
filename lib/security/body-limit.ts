export class RequestBodyTooLargeError extends Error {
  readonly maxBytes: number

  constructor(maxBytes: number) {
    super(`Request body exceeds the ${maxBytes}-byte limit.`)
    this.name = 'RequestBodyTooLargeError'
    this.maxBytes = maxBytes
  }
}

/** Read a request body with a content-length fast path and a hard streaming cap. */
export async function readRequestBody(request: Pick<Request, 'body' | 'headers'>, maxBytes: number) {
  const contentLength = parseContentLength(request.headers.get('content-length'))
  if (contentLength !== null && contentLength > maxBytes) throw new RequestBodyTooLargeError(maxBytes)

  if (!request.body) return ''

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel()
        throw new RequestBodyTooLargeError(maxBytes)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(body)
}

export async function readJsonBody(request: Pick<Request, 'body' | 'headers'>, maxBytes: number) {
  return JSON.parse(await readRequestBody(request, maxBytes)) as unknown
}

export function isRequestBodyTooLarge(error: unknown): error is RequestBodyTooLargeError {
  return error instanceof RequestBodyTooLargeError
}

function parseContentLength(value: string | null) {
  if (!value || !/^[0-9]+$/.test(value.trim())) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}
