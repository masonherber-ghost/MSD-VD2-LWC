import type { Statement } from 'better-sqlite3'
import { db } from '../database.ts'

/**
 * Builds an UPDATE from an allow-list — the pattern carried over from the
 * previous build, where it served as both the PATCH implementation and the
 * injection guard. Unknown keys are ignored rather than rejected.
 *
 * Returns false when there is nothing to write, so callers can short-circuit
 * to a plain read instead of issuing `UPDATE ... SET updated_at = ...`.
 */
export function applyUpdate(
  table: string,
  id: number,
  updates: Record<string, unknown>,
  allowedFields: readonly string[],
): boolean {
  const fields: string[] = []
  const values: unknown[] = []

  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      fields.push(`${key} = ?`)
      values.push(updates[key])
    }
  }

  if (fields.length === 0) return false

  fields.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)
  db.prepare(`UPDATE ${table} SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return true
}

/**
 * Replaces a child collection wholesale: delete every row for the parent, then
 * reinsert. Callers must wrap this in a transaction — the previous build did
 * not, so a failure between the delete and the reinsert destroyed the data.
 */
export function replaceChildren<T>(
  deleteStmt: Statement,
  insertStmt: Statement,
  parentId: number,
  rows: T[],
  toParams: (row: T) => unknown[],
): void {
  deleteStmt.run(parentId)
  for (const row of rows) insertStmt.run(...toParams(row))
}

/** Groups child rows by their parent id, so children hydrate in one query per table. */
export function groupBy<T, K extends keyof T>(rows: T[], key: K): Map<T[K], T[]> {
  const map = new Map<T[K], T[]>()
  for (const row of rows) {
    const k = row[key]
    const existing = map.get(k)
    if (existing) existing.push(row)
    else map.set(k, [row])
  }
  return map
}

/** `IN (?, ?, ?)` placeholder list. Returns null when there is nothing to query for. */
export function placeholders(count: number): string | null {
  return count > 0 ? Array(count).fill('?').join(', ') : null
}

/** Parses a JSON-in-TEXT column defensively — a bad value must not take out the request. */
export function parseJsonArray(value: unknown): string[] {
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const toBool = (v: unknown): boolean => v === 1 || v === true
export const toInt = (v: boolean | undefined | null): number => (v ? 1 : 0)
