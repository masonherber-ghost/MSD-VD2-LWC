import { db } from '../database.ts'
import { HttpError } from '../middleware/error-handler.ts'
import {
  ADMIN_TABLES,
  HAS_UPDATED_AT,
  columnExpression,
  selectList,
  type TableSpec,
} from '../lib/admin-tables.ts'

/**
 * All SQL for the /data screen.
 *
 * Statements are built per call rather than prepared once, because sort, filter
 * and the patched column set all vary with the request. That is safe here for
 * one reason and only one: every identifier that reaches a query string is
 * resolved through the registry in lib/admin-tables.ts first. A column name the
 * registry does not declare returns undefined and becomes a 400 — it never
 * reaches SQL. Values are always bound parameters.
 */

export interface ListParams {
  start?: number
  end?: number
  sort?: string
  order?: 'asc' | 'desc'
  /** Equality filters, narrowed to declared columns here. */
  filters?: Record<string, string>
  /** Free-text search across the table's searchable columns. */
  q?: string
}

export interface ListResult {
  data: Record<string, unknown>[]
  total: number
}

export function spec(name: string): TableSpec {
  const t = ADMIN_TABLES[name]
  if (!t) throw new HttpError(404, `Unknown table: ${name}.`)
  return t
}

/** Column metadata for the client, without any row data. */
export function schema() {
  return Object.entries(ADMIN_TABLES).map(([name, t]) => ({
    name,
    label: t.label,
    columns: t.columns,
    editable: t.editable,
    creatable: t.creatable,
    required: t.required,
    searchable: t.searchable,
    deletable: t.deletable,
    cascades: t.cascades,
    primaryKey: t.primaryKey,
    rowCount: (db.prepare(`SELECT count(*) c FROM "${name}"`).get() as { c: number }).c,
  }))
}

/** SQLite constraint failures are the user's problem, not a 500. */
function rethrowConstraint(e: unknown): never {
  const message = e instanceof Error ? e.message : String(e)
  if (/UNIQUE constraint failed/i.test(message)) throw new HttpError(409, message)
  if (/CHECK constraint failed|FOREIGN KEY constraint failed|NOT NULL constraint failed/i.test(message)) {
    throw new HttpError(400, message)
  }
  throw e
}

export function list(name: string, params: ListParams = {}): ListResult {
  const t = spec(name)

  const where: string[] = []
  const values: unknown[] = []

  for (const [column, value] of Object.entries(params.filters ?? {})) {
    const expression = columnExpression(t, column)
    if (!expression) throw new HttpError(400, `Unknown filter column: ${column}.`)
    if (value === '') {
      where.push(`${expression} IS NULL`)
    } else {
      where.push(`${expression} = ?`)
      values.push(value)
    }
  }

  const q = params.q?.trim()
  if (q && t.searchable.length) {
    const clauses = t.searchable
      .map((c) => columnExpression(t, c))
      .filter(Boolean)
      .map((expression) => `${expression} LIKE ?`)
    if (clauses.length) {
      where.push(`(${clauses.join(' OR ')})`)
      clauses.forEach(() => values.push(`%${q}%`))
    }
  }

  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : ''

  const total = (
    db.prepare(`SELECT count(*) c FROM "${name}"${whereSql}`).get(...values) as { c: number }
  ).c

  const sortField = params.sort ?? t.defaultSort?.field
  const sortExpression = sortField ? columnExpression(t, sortField) : undefined
  if (sortField && !sortExpression) throw new HttpError(400, `Unknown sort column: ${sortField}.`)
  const order = params.order === 'desc' ? 'DESC' : 'ASC'
  const orderSql = sortExpression ? ` ORDER BY ${sortExpression} ${order}` : ''

  const start = Math.max(0, params.start ?? 0)
  const end = params.end ?? start + 25
  const limit = Math.max(1, Math.min(200, end - start))

  const data = db
    .prepare(`SELECT ${selectList(t)} FROM "${name}"${whereSql}${orderSql} LIMIT ? OFFSET ?`)
    .all(...values, limit, start) as Record<string, unknown>[]

  return { data, total }
}

export function getOne(name: string, id: number): Record<string, unknown> {
  const t = spec(name)
  const row = db
    .prepare(`SELECT ${selectList(t)} FROM "${name}" WHERE "${t.primaryKey}" = ?`)
    .get(id) as Record<string, unknown> | undefined
  if (!row) throw new HttpError(404, `No row ${id} in ${name}.`)
  return row
}

/**
 * Narrows a request body to the columns the registry says are writable, and
 * coerces the values a form can only send as strings.
 */
function writableFields(t: TableSpec, body: Record<string, unknown>) {
  const fields: string[] = []
  const values: unknown[] = []

  for (const column of t.editable) {
    if (!(column.name in body)) continue
    let value = body[column.name]

    // An empty form field means NULL, not '' — and for a numeric FK, certainly not 0.
    if (value === '' || value === undefined) value = null
    if (value !== null && column.fk) {
      const n = Number(value)
      if (!Number.isInteger(n)) throw new HttpError(400, `${column.name} must be a whole number.`)
      value = n
    }
    if (typeof value === 'boolean') value = value ? 1 : 0

    fields.push(column.name)
    values.push(value)
  }

  return { fields, values }
}

export function create(name: string, body: Record<string, unknown>): Record<string, unknown> {
  const t = spec(name)
  if (!t.creatable) throw new HttpError(405, `Rows cannot be created in ${name}.`)

  const { fields, values } = writableFields(t, body)

  const missing = t.required.filter(
    (r) => !fields.includes(r) || values[fields.indexOf(r)] === null,
  )
  if (missing.length) throw new HttpError(400, `Missing required: ${missing.join(', ')}.`)
  if (!fields.length) throw new HttpError(400, 'No writable fields supplied.')

  try {
    const result = db
      .prepare(
        `INSERT INTO "${name}" (${fields.map((f) => `"${f}"`).join(', ')}) ` +
          `VALUES (${fields.map(() => '?').join(', ')})`,
      )
      .run(...values)
    return getOne(name, Number(result.lastInsertRowid))
  } catch (e) {
    rethrowConstraint(e)
  }
}

export function update(
  name: string,
  id: number,
  body: Record<string, unknown>,
): Record<string, unknown> {
  const t = spec(name)
  if (!t.editable.length) throw new HttpError(405, `Rows cannot be edited in ${name}.`)

  getOne(name, id) // 404 before anything else
  const { fields, values } = writableFields(t, body)
  if (!fields.length) throw new HttpError(400, 'No writable fields supplied.')

  const assignments = fields.map((f) => `"${f}" = ?`)
  if (HAS_UPDATED_AT.has(name)) assignments.push(`"updated_at" = CURRENT_TIMESTAMP`)

  try {
    db.prepare(`UPDATE "${name}" SET ${assignments.join(', ')} WHERE "${t.primaryKey}" = ?`).run(
      ...values,
      id,
    )
  } catch (e) {
    if (e instanceof HttpError) throw e
    rethrowConstraint(e)
  }

  return getOne(name, id)
}

export interface DeleteResult {
  deleted: { table: string; id: number }
  cascaded: Record<string, number>
}

/** Row counts for every table, used to report what a cascade actually removed. */
function countAll(): Record<string, number> {
  return Object.fromEntries(
    Object.keys(ADMIN_TABLES).map((n) => [
      n,
      (db.prepare(`SELECT count(*) c FROM "${n}"`).get() as { c: number }).c,
    ]),
  )
}

export function remove(name: string, id: number): DeleteResult {
  const t = spec(name)
  if (!t.deletable) throw new HttpError(405, `Rows cannot be deleted from ${name}.`)
  getOne(name, id)

  // SQLite will not tell us what a cascade took, so diff the counts around it.
  const before = countAll()
  try {
    db.prepare(`DELETE FROM "${name}" WHERE "${t.primaryKey}" = ?`).run(id)
  } catch (e) {
    if (e instanceof HttpError) throw e
    rethrowConstraint(e)
  }
  const after = countAll()

  const cascaded: Record<string, number> = {}
  for (const [table, count] of Object.entries(before)) {
    const lost = count - after[table]
    if (lost > 0 && table !== name) cascaded[table] = lost
  }

  return { deleted: { table: name, id }, cascaded }
}
