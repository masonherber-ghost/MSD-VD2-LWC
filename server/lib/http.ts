import { HttpError } from '../middleware/error-handler.ts'

/**
 * Parses a route param as a positive integer.
 *
 * The previous build used bare `parseInt(id)` with no radix and no validation,
 * so `/api/jobs/abc` passed `NaN` into SQL and came back as a 404 — failing soft
 * and hiding the bad request.
 */
export function parseId(value: string | undefined, name = 'id'): number {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, `Invalid ${name}: expected a positive integer.`)
  }
  return n
}

/** Parses an optional numeric query param. Returns undefined when absent, throws when malformed. */
export function parseOptionalId(value: unknown, name: string): number | undefined {
  if (value === undefined || value === '') return undefined
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, `Invalid ${name}: expected a positive integer.`)
  }
  return n
}

/** Validates a value is one of an allowed set. */
export function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  name: string,
  { optional = false } = {},
): T | undefined {
  if (value === undefined || value === '') {
    if (optional) return undefined
    throw new HttpError(400, `${name} is required.`)
  }
  if (!allowed.includes(value as T)) {
    throw new HttpError(400, `Invalid ${name}. Expected one of: ${allowed.join(', ')}.`)
  }
  return value as T
}

export function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${name} is required.`)
  }
  return value.trim()
}
