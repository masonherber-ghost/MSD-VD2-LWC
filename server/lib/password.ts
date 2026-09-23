/**
 * Password hashing for the prototype's auth flow.
 *
 * scrypt with a per-user salt, both stored hex, compared with timingSafeEqual —
 * the scheme the ciam table was designed around (see 002_recruitment_schema.sql).
 * The hashing is real; the *session* is not. See server/routes/auth.ts.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex')
  return { hash: derive(password, salt), salt }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = Buffer.from(derive(password, salt), 'hex')
  const stored = Buffer.from(hash, 'hex')
  // timingSafeEqual throws on a length mismatch, which a stored hash from
  // another scheme would cause — treat that as "wrong password", not a crash.
  if (candidate.length !== stored.length) return false
  return timingSafeEqual(candidate, stored)
}

function derive(password: string, salt: string): string {
  return scryptSync(password, salt, KEY_LENGTH).toString('hex')
}
