import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { NextResponse } from 'next/server'

import { clearViewerSessionCookie, setViewerSessionCookies, setViewerSessionRequestCookie } from '../lib/shares/request'
import { getViewerSessionCookieName } from '../lib/shares/exchange'

const shareA = 'aB3xK9pQ2'
const shareB = 'Bc4yL0rS3'

function responseWithCookieSpy() {
  const cookieSet = vi.fn()
  return {
    response: { headers: new Headers(), cookies: { set: cookieSet } } as unknown as NextResponse,
    cookieSet,
  }
}

describe('share-scoped viewer session cookies', () => {
  it('keeps separate share sessions in the browser at the same time', () => {
    const first = responseWithCookieSpy()
    const second = responseWithCookieSpy()

    setViewerSessionCookies(first.response, 'https://repoview.test/view/aB3xK9pQ2', {
      shareId: '22222222-2222-4222-8222-222222222222',
      shareCode: shareA,
      rawSessionToken: 'session-a',
      expiresAt: null,
    })
    setViewerSessionCookies(second.response, 'https://repoview.test/view/Bc4yL0rS3', {
      shareId: '55555555-5555-4555-8555-555555555555',
      shareCode: shareB,
      rawSessionToken: 'session-b',
      expiresAt: null,
    })

    const cookieA = first.cookieSet.mock.calls[0][0]
    const cookieB = second.cookieSet.mock.calls[0][0]
    const browserCookies = new Map<string, string>()
    browserCookies.set(cookieA.name, cookieA.value)
    browserCookies.set(cookieB.name, cookieB.value)
    expect(cookieA.name).toBe(getViewerSessionCookieName(shareA))
    expect(cookieB.name).toBe(getViewerSessionCookieName(shareB))
    expect(cookieA.name).not.toBe(cookieB.name)
    expect(browserCookies.get(cookieA.name)).toBe('session-a')
    expect(browserCookies.get(cookieB.name)).toBe('session-b')
    expect(cookieA.name).toMatch(/^repoview_viewer_session_[a-f0-9]{24}$/)
    expect(cookieA.name).not.toContain(shareA)
  })

  it('keeps session tokens HttpOnly with secure share cookie flags', () => {
    const { response, cookieSet } = responseWithCookieSpy()

    setViewerSessionCookies(response, 'https://repoview.test/view/aB3xK9pQ2', {
      shareId: '22222222-2222-4222-8222-222222222222',
      shareCode: shareA,
      rawSessionToken: 'server-only-session-token',
      expiresAt: null,
    })

    expect(cookieSet.mock.calls[0][0]).toMatchObject({
      name: getViewerSessionCookieName(shareA),
      value: 'server-only-session-token',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    })
  })

  it('updates the current share cookie while preserving another share cookie', () => {
    const requestHeaders = new Headers({
      cookie: `${getViewerSessionCookieName(shareA)}=old-a; ${getViewerSessionCookieName(shareB)}=session-b`,
    })

    setViewerSessionRequestCookie(requestHeaders, {
      shareId: '22222222-2222-4222-8222-222222222222',
      shareCode: shareA,
      rawSessionToken: 'new-a',
      expiresAt: null,
    })

    const cookieHeader = requestHeaders.get('cookie') ?? ''
    expect(cookieHeader).toContain(`${getViewerSessionCookieName(shareA)}=new-a`)
    expect(cookieHeader).toContain(`${getViewerSessionCookieName(shareB)}=session-b`)
  })

  it('clears only the selected share session cookie', () => {
    const { response, cookieSet } = responseWithCookieSpy()

    clearViewerSessionCookie(response, 'https://repoview.test/view/aB3xK9pQ2', shareA)

    expect(cookieSet).toHaveBeenCalledTimes(1)
    expect(cookieSet.mock.calls[0][0]).toMatchObject({
      name: getViewerSessionCookieName(shareA),
      value: '',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    expect(cookieSet.mock.calls[0][0].name).not.toBe(getViewerSessionCookieName(shareB))
  })
})
