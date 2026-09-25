import { describe, expect, it } from 'vitest'

import { readJsonBody, readRequestBody } from '../lib/security/body-limit'

describe('request body limits', () => {
  it('rejects an oversized Content-Length before reading or parsing', async () => {
    const request = new Request('https://repoview.test/api/view/events', {
      method: 'POST',
      headers: { 'content-length': '1001' },
      body: '{"events":[]}',
    })

    await expect(readJsonBody(request, 1000)).rejects.toMatchObject({ name: 'RequestBodyTooLargeError' })
  })

  it('bounds chunked bodies without a Content-Length header', async () => {
    const request = new Request('https://repoview.test/api/view/events', {
      method: 'POST',
      body: '0123456789',
    })

    await expect(readRequestBody(request, 5)).rejects.toMatchObject({ name: 'RequestBodyTooLargeError' })
  })

  it('reads an allowed JSON body', async () => {
    const request = new Request('https://repoview.test/api/view/events', {
      method: 'POST',
      body: JSON.stringify({ events: [] }),
    })

    await expect(readJsonBody(request, 1024)).resolves.toEqual({ events: [] })
  })
})
