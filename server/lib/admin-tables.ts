import { db } from '../database.ts'

/**
 * The registry that drives the /data screen.
 *
 * The reference build hand-wrote this for five tables. Every table in the
 * database is wanted here, so it is derived from SQLite itself — table_info,
 * foreign_key_list and the stored CREATE TABLE text — and then narrowed by the
 * overrides below. A new column appears on the screen as soon as it exists.
 *
 * Its other job is safety: the repository resolves every identifier it puts
 * into SQL through this registry, so a column name the registry does not
 * declare becomes a 400 rather than a fragment of a query.
 */

export interface ColumnSpec {
  name: string
  /** Rendered as a dropdown when present (read from the column's CHECK ... IN). */
  options?: readonly string[]
  /** Numeric FK — empty string becomes NULL rather than 0. */
  fk?: boolean
  /** Rendered as a textarea. */
  long?: boolean
}

export interface TableSpec {
  label: string
  /** Columns returned to the client, in schema order. */
  columns: readonly string[]
  /** Subset of `columns` the screen may write. */
  editable: readonly ColumnSpec[]
  creatable: boolean
  /** Columns a create must supply, mirroring the table's NOT NULL constraints. */
  required: readonly string[]
  /** Text columns the free-text `q` search runs LIKE against. */
  searchable: readonly string[]
  deletable: boolean
  /** What a delete takes with it, so the UI can warn before asking. */
  cascades?: string
  defaultSort?: { field: string; order: 'asc' | 'desc' }
  /** Primary key column; every table here has a single integer one. */
  primaryKey: string
}

/**
 * Columns that must never leave the server. They are dropped from `columns`,
 * so they are never selected, never written and never sorted on.
 */
const HIDDEN: Record<string, readonly string[]> = {
  ciam: ['password_hash', 'password_salt'],
}

/**
 * Tables the screen may read but not write. `migrations` is the runner's own
 * bookkeeping; `ciam` holds credentials, and creating a login means hashing a
 * password — that belongs in an auth flow, not a raw table editor.
 */
const READ_ONLY = new Set(['migrations'])
const NOT_CREATABLE = new Set(['ciam'])

/** Never writable even when the column is otherwise ordinary. */
const NEVER_EDITABLE = new Set(['created_at', 'updated_at', 'applied_at'])

interface ColumnInfo {
  cid: number
  name: string
  type: string
  notnull: number
  dflt_value: string | null
  pk: number
}

interface ForeignKey {
  table: string
  from: string
  to: string | null
}

const humanize = (name: string): string =>
  name
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())

/**
 * Enum values from a column's CHECK (col IN ('a','b')) constraint, so the form
 * can offer a dropdown instead of letting the write fail on the constraint.
 */
function checkOptions(createSql: string): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const pattern = /CHECK\s*\(\s*(\w+)\s+IN\s*\(([^)]*)\)/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(createSql)) !== null) {
    const values = [...match[2].matchAll(/'([^']*)'/g)].map((m) => m[1])
    if (values.length) out[match[1]] = values
  }
  return out
}

function buildRegistry(): Record<string, TableSpec> {
  const tables = (
    db
      .prepare(
        "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string; sql: string }[]
  )

  // Which tables point at this one, so a delete can be described before it runs.
  const children: Record<string, Set<string>> = {}
  for (const { name } of tables) {
    for (const fk of db.prepare(`PRAGMA foreign_key_list("${name}")`).all() as ForeignKey[]) {
      ;(children[fk.table] ??= new Set()).add(name)
    }
  }

  const registry: Record<string, TableSpec> = {}

  for (const { name, sql } of tables) {
    const info = db.prepare(`PRAGMA table_info("${name}")`).all() as ColumnInfo[]
    const fks = new Set(
      (db.prepare(`PRAGMA foreign_key_list("${name}")`).all() as ForeignKey[]).map((f) => f.from),
    )
    const options = checkOptions(sql ?? '')
    const hidden = new Set(HIDDEN[name] ?? [])

    const visible = info.filter((c) => !hidden.has(c.name))
    const pk = info.find((c) => c.pk === 1)?.name ?? 'rowid'
    const writable = !READ_ONLY.has(name)

    const editable: ColumnSpec[] = writable
      ? visible
          .filter((c) => c.pk !== 1 && !NEVER_EDITABLE.has(c.name))
          .map((c) => {
            const spec: ColumnSpec = { name: c.name }
            if (options[c.name]) spec.options = options[c.name]
            if (fks.has(c.name)) spec.fk = true
            // Long-form prose gets a textarea rather than a single-line input.
            if (/description|summary|about|letter|content|notes/i.test(c.name)) spec.long = true
            return spec
          })
      : []

    const kids = [...(children[name] ?? [])].sort()

    registry[name] = {
      label: humanize(name),
      columns: visible.map((c) => c.name),
      editable,
      // A create supplies exactly the editable columns; there is no third list.
      creatable: writable && !NOT_CREATABLE.has(name) && editable.length > 0,
      required: visible
        .filter((c) => c.notnull === 1 && c.dflt_value === null && c.pk !== 1)
        .filter((c) => !NEVER_EDITABLE.has(c.name))
        .map((c) => c.name),
      searchable: visible
        .filter((c) => /CHAR|CLOB|TEXT/i.test(c.type) || c.type === '')
        .map((c) => c.name),
      deletable: writable,
      cascades: kids.length
        ? `Deleting a row also deletes its related rows in: ${kids.join(', ')}.`
        : undefined,
      defaultSort: { field: pk, order: 'asc' },
      primaryKey: pk,
    }
  }

  return registry
}

export const ADMIN_TABLES: Record<string, TableSpec> = buildRegistry()

/** Tables carrying `updated_at`, so a write can touch it. */
export const HAS_UPDATED_AT = new Set(
  Object.entries(ADMIN_TABLES)
    .filter(([, t]) => t.columns.includes('updated_at'))
    .map(([name]) => name),
)

/** The SQL for one declared column, or undefined if it is not declared. */
export function columnExpression(t: TableSpec, column: string): string | undefined {
  return t.columns.includes(column) ? `"${column}"` : undefined
}

export function isPlainColumn(t: TableSpec, column: string): boolean {
  return t.columns.includes(column)
}

export function selectList(t: TableSpec): string {
  return t.columns.map((c) => `"${c}"`).join(', ')
}
