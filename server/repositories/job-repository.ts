import type { Statement } from 'better-sqlite3'
import { db } from '../database.ts'
import { applyUpdate, groupBy, parseJsonArray, placeholders } from '../lib/sql.ts'
import { iconForJobType } from '../lib/job-icons.ts'
import { DomainError } from './account-repository.ts'
import type {
  Job, JobDetail, JobDriverLicence, JobLanguage, JobListItem, JobSchedule, JobStatus,
} from '../types.ts'

const UPDATABLE = [
  'title', 'subtitle', 'company_name', 'description', 'about_us', 'location', 'pay',
  'contract_type', 'start_date', 'hours_description', 'posted_date', 'closing_date',
  'external_job_id', 'experience_level', 'education_required', 'job_type', 'icon',
  'driver_licence_label', 'max_shortlist', 'positions_available',
  'application_management', 'interview_options', 'campaign_length_weeks',
  'vacancy_contact_id', 'status', 'views',
] as const

/** Simple `job_id -> content` child tables, all replaced the same way. */
const CONTENT_CHILDREN = {
  responsibilities: { table: 'job_responsibilities', column: 'content' },
  selling_points: { table: 'job_selling_points', column: 'content' },
  pre_employment_checks: { table: 'job_pre_employment_checks', column: 'content' },
  employer_values: { table: 'job_employer_values', column: 'content' },
  skills: { table: 'job_skills', column: 'skill_name' },
  certificates: { table: 'job_certificates', column: 'certificate_name' },
  licence_endorsements: { table: 'job_licence_endorsements', column: 'endorsement' },
} as const

type ContentChildKey = keyof typeof CONTENT_CHILDREN

let selectById: Statement | undefined
let insertJob: Statement | undefined

/**
 * Normalise a write payload before it reaches the allow-list.
 *
 * Two things happen here, and both belong server-side rather than in a form:
 *
 * 1. The JSON array columns are stringified.
 * 2. `icon` is derived from `job_type`. A payload that sets `job_type` and says
 *    nothing about `icon` gets the mapped icon -- or null, when the type has no
 *    artwork, which correctly CLEARS a stale icon left by a previous type.
 *    An explicit `icon` in the payload always wins, so a job can be overridden
 *    away from its type's default; a payload with neither key leaves the stored
 *    icon alone, because `applyUpdate` only writes keys it is given.
 */
function toPatch(input: Record<string, unknown>): Record<string, unknown> {
  const patch = { ...input }

  for (const k of ['application_management', 'interview_options'] as const) {
    if (k in patch) patch[k] = JSON.stringify(patch[k] ?? [])
  }
  if ('job_type' in patch && !('icon' in patch)) {
    patch.icon = iconForJobType(patch.job_type)
  }
  return patch
}

function toJob(row: Record<string, unknown>): Job {
  return {
    ...(row as unknown as Job),
    application_management: parseJsonArray(row.application_management),
    interview_options: parseJsonArray(row.interview_options),
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Jobs for an account, with candidate counts.
 *
 * Scoped by account_id, not by the individual. The previous build filtered to
 * `user_id IN (SELECT id FROM contacts WHERE ciam_id = ?)`, so a colleague on
 * the same employer account could not see these rows at all.
 */
export function findByAccount(
  accountId: number,
  filters: { status?: JobStatus; contact_id?: number } = {},
): JobListItem[] {
  const where = ['j.account_id = ?']
  const params: unknown[] = [accountId]

  if (filters.status) {
    where.push('j.status = ?')
    params.push(filters.status)
  }
  if (filters.contact_id) {
    where.push('j.contact_id = ?')
    params.push(filters.contact_id)
  }

  const rows = db
    .prepare(`
      SELECT
        j.*,
        COUNT(c.id) AS candidate_count,
        COALESCE(SUM(CASE WHEN c.status = 'applied' THEN 1 ELSE 0 END), 0) AS new_candidate_count,
        NULLIF(TRIM(COALESCE(ct.first_name, '') || ' ' || COALESCE(ct.last_name, '')), '') AS creator_name
      FROM jobs j
      LEFT JOIN candidates c ON c.job_id = j.id
      LEFT JOIN contacts  ct ON ct.id = j.contact_id
      WHERE ${where.join(' AND ')}
      GROUP BY j.id
      ORDER BY j.created_at DESC
    `)
    .all(...params) as Record<string, unknown>[]

  return rows.map((r) => ({ ...toJob(r), ...{
    candidate_count: r.candidate_count as number,
    new_candidate_count: r.new_candidate_count as number,
    creator_name: r.creator_name as string | null,
  } }))
}

/**
 * One job with every child collection.
 *
 * Children are fetched one query per child table rather than the previous
 * build's ~12 sequential lookups plus a nested query per language.
 */
export function findById(id: number): JobDetail | null {
  selectById ??= db.prepare('SELECT * FROM jobs WHERE id = ?')
  const row = selectById.get(id) as Record<string, unknown> | undefined
  if (!row) return null

  const job = toJob(row)
  const detail = { ...job } as JobDetail

  for (const [key, { table, column }] of Object.entries(CONTENT_CHILDREN)) {
    const rows = db
      .prepare(`SELECT ${column} AS value FROM ${table} WHERE job_id = ? ORDER BY id`)
      .all(id) as { value: string }[]
    detail[key as ContentChildKey] = rows.map((r) => r.value)
  }

  // Languages and their abilities: two queries, joined in JS.
  const languages = db
    .prepare('SELECT id, language_name FROM job_languages WHERE job_id = ? ORDER BY id')
    .all(id) as { id: number; language_name: string }[]

  const langPlaceholders = placeholders(languages.length)
  const abilityRows = langPlaceholders
    ? (db
        .prepare(
          `SELECT language_id, ability FROM job_language_abilities
            WHERE language_id IN (${langPlaceholders}) ORDER BY id`,
        )
        .all(...languages.map((l) => l.id)) as { language_id: number; ability: string }[])
    : []
  const abilitiesByLang = groupBy(abilityRows, 'language_id')

  detail.languages = languages.map<JobLanguage>((l) => ({
    id: l.id,
    language_name: l.language_name,
    abilities: (abilitiesByLang.get(l.id) ?? []).map((a) => a.ability),
  }))

  detail.driver_licences = db
    .prepare(
      'SELECT class_value, class_label, stage FROM job_driver_licences WHERE job_id = ? ORDER BY id',
    )
    .all(id) as JobDriverLicence[]

  const schedule = db
    .prepare('SELECT schedule_type, hours, additional_info FROM job_schedule WHERE job_id = ?')
    .get(id) as Omit<JobSchedule, 'days'> | undefined

  detail.schedule = schedule
    ? {
        ...schedule,
        days: (
          db
            .prepare('SELECT day_name FROM job_schedule_days WHERE job_id = ? ORDER BY id')
            .all(id) as { day_name: string }[]
        ).map((d) => d.day_name),
      }
    : null

  detail.vacancy_contact = job.vacancy_contact_id
    ? ((db
        .prepare(
          'SELECT id, first_name, last_name, job_title, phone FROM contacts WHERE id = ?',
        )
        .get(job.vacancy_contact_id) as JobDetail['vacancy_contact']) ?? null)
    : null

  return detail
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

type ChildInput = Partial<Record<ContentChildKey, string[]>> & {
  languages?: { language_name: string; abilities?: string[] }[]
  driver_licences?: JobDriverLicence[]
  schedule?: Partial<JobSchedule> | null
}

/** Replaces every child collection present on `input`. Caller supplies the transaction. */
function writeChildren(jobId: number, input: ChildInput): void {
  for (const [key, { table, column }] of Object.entries(CONTENT_CHILDREN)) {
    const values = input[key as ContentChildKey]
    if (!values) continue
    db.prepare(`DELETE FROM ${table} WHERE job_id = ?`).run(jobId)
    const insert = db.prepare(`INSERT INTO ${table} (job_id, ${column}) VALUES (?, ?)`)
    for (const v of values) insert.run(jobId, v)
  }

  if (input.languages) {
    // Abilities cascade from job_languages, so deleting the parents is enough.
    db.prepare('DELETE FROM job_languages WHERE job_id = ?').run(jobId)
    const insertLang = db.prepare(
      'INSERT INTO job_languages (job_id, language_name) VALUES (?, ?) RETURNING id',
    )
    const insertAbility = db.prepare(
      'INSERT INTO job_language_abilities (language_id, ability) VALUES (?, ?)',
    )
    for (const lang of input.languages) {
      const { id } = insertLang.get(jobId, lang.language_name) as { id: number }
      for (const ability of lang.abilities ?? []) insertAbility.run(id, ability)
    }
  }

  if (input.driver_licences) {
    db.prepare('DELETE FROM job_driver_licences WHERE job_id = ?').run(jobId)
    const insert = db.prepare(
      'INSERT INTO job_driver_licences (job_id, class_value, class_label, stage) VALUES (?, ?, ?, ?)',
    )
    for (const l of input.driver_licences) {
      insert.run(jobId, l.class_value, l.class_label, l.stage ?? null)
    }
  }

  if (input.schedule !== undefined) {
    db.prepare('DELETE FROM job_schedule WHERE job_id = ?').run(jobId)
    db.prepare('DELETE FROM job_schedule_days WHERE job_id = ?').run(jobId)
    if (input.schedule) {
      db.prepare(
        'INSERT INTO job_schedule (job_id, schedule_type, hours, additional_info) VALUES (?, ?, ?, ?)',
      ).run(
        jobId,
        input.schedule.schedule_type ?? null,
        input.schedule.hours ?? null,
        input.schedule.additional_info ?? null,
      )
      const insertDay = db.prepare(
        'INSERT INTO job_schedule_days (job_id, day_name) VALUES (?, ?)',
      )
      for (const day of input.schedule.days ?? []) insertDay.run(jobId, day)
    }
  }
}

export function create(
  input: Record<string, unknown> & { account_id: number; title: string },
): JobDetail {
  insertJob ??= db.prepare(`
    INSERT INTO jobs (account_id, contact_id, vacancy_contact_id, title, status)
    VALUES (?, ?, ?, ?, ?)
    RETURNING id
  `)
  const insert = insertJob

  const run = db.transaction((): number => {
    const { id } = insert.get(
      input.account_id,
      (input.contact_id as number | null) ?? null,
      (input.vacancy_contact_id as number | null) ?? null,
      input.title,
      (input.status as string) ?? 'draft',
    ) as { id: number }

    applyUpdate('jobs', id, toPatch(input), UPDATABLE)
    writeChildren(id, input as ChildInput)
    return id
  })

  return findById(run())!
}

export function update(id: number, input: Record<string, unknown>): JobDetail | null {
  const run = db.transaction((): boolean => {
    if (!selectById) selectById = db.prepare('SELECT * FROM jobs WHERE id = ?')
    if (!selectById.get(id)) return false

    applyUpdate('jobs', id, toPatch(input), UPDATABLE)
    writeChildren(id, input as ChildInput)
    return true
  })

  return run() ? findById(id) : null
}

/**
 * Close a vacancy. Not called yet: the prototype's "Close job" flow
 * (/jobs/set-outcome) leaves the status as it is. Here for when closing is real.
 *
 * Only a PUBLISHED vacancy (`active`) can be closed: a draft is discarded, not
 * closed, and one in review is with MSD. That is a business rule, so it lives
 * here and the route turns it into a 400 — the UI offering "Close job" only on
 * a published card is a convenience, not the control.
 *
 * The employer's outcome (filled / partly filled / not filled) and their
 * details are NOT stored: the `jobs` table has no column for them. Adding one
 * is a schema decision, raised rather than made here.
 *
 * Returns null when there is no such vacancy.
 */
export function close(id: number): JobDetail | null {
  const run = db.transaction((): boolean | null => {
    const row = db.prepare('SELECT status FROM jobs WHERE id = ?').get(id) as
      | { status: JobStatus }
      | undefined
    if (!row) return null
    if (row.status !== 'active') {
      throw new DomainError('Only a published vacancy can be closed.')
    }
    applyUpdate('jobs', id, { status: 'closed' }, UPDATABLE)
    return true
  })

  return run() ? findById(id) : null
}

/**
 * Publish a vacancy MSD has reviewed (`reviewed` -> `active`): the employer
 * accepting MSD's changes, from Publish job on the record page.
 *
 * Only `reviewed` can be published this way — a draft goes to review first,
 * and one still `in_review` is with MSD. Enforced here; the route makes it a 400.
 * Sets `posted_date` to today, as a published listing carries one.
 */
export function publish(id: number): JobDetail | null {
  const run = db.transaction((): boolean | null => {
    const row = db.prepare('SELECT status FROM jobs WHERE id = ?').get(id) as
      | { status: JobStatus }
      | undefined
    if (!row) return null
    if (row.status !== 'reviewed') {
      throw new DomainError('Only a vacancy with changes to review can be published.')
    }
    const today = new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
    applyUpdate('jobs', id, { status: 'active', posted_date: today }, UPDATABLE)
    return true
  })

  return run() ? findById(id) : null
}

export function remove(id: number): boolean {
  return db.prepare('DELETE FROM jobs WHERE id = ?').run(id).changes > 0
}

export function incrementViews(id: number): void {
  db.prepare('UPDATE jobs SET views = views + 1 WHERE id = ?').run(id)
}
