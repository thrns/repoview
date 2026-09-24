import 'server-only'

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

import { getServerEnv } from '../env/server'

export const TOKEN_BYTES = 32
export const SHARE_CODE_BYTES = 6

export function generateShareToken() {
  return generateToken()
}

export function generateShareCode() {
  return randomBytes(SHARE_CODE_BYTES).toString('base64url')
}

export function generateViewerSessionToken() {
  return generateToken()
}

export function hashShareToken(rawToken: string) {
  return hashToken(rawToken, getServerEnv().SHARE_TOKEN_PEPPER)
}

export function hashViewerSessionToken(rawToken: string) {
  return hashToken(rawToken, getServerEnv().SESSION_TOKEN_PEPPER)
}

export function hashViewerIdentity(rawViewerId: string) {
  return hashToken(rawViewerId, getServerEnv().SESSION_TOKEN_PEPPER)
}

export function hashNetworkValue(value: string) {
  return hashToken(value, getServerEnv().IP_HASH_SALT)
}

export function hashToken(rawToken: string, pepper: string) {
  if (!rawToken || !pepper) {
    throw new Error('Cannot hash an empty token or pepper.')
  }

  return createHmac('sha256', pepper).update(rawToken, 'utf8').digest('hex')
}

export function verifyTokenHash(rawToken: string, expectedHash: string, pepper: string) {
  if (!rawToken || !expectedHash || !pepper || !/^[a-f0-9]{64}$/i.test(expectedHash)) {
    return false
  }

  const actual = Buffer.from(hashToken(rawToken, pepper), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function generateToken() {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}
