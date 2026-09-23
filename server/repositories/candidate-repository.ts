import type { Statement } from 'better-sqlite3'
import { db } from '../database.ts'
import { applyUpdate, groupBy, placeholders } from '../lib/sql.ts'
import type {
  Candidate, CandidateDetail, CandidateEducation, CandidateExperience,
  CandidateLanguage, CandidateNextUp, CandidatePreferences, CandidateStatus,
  CandidateStatusCounts, CandidateStrength,
} from '../types.ts'

const UPDATABLE = [
  'initials', 'role', 'avatar_color', 'location', 'phone', 'email', 'applied_on',
  'source', 'referral', 'status', 'match_level', 'personal_summary', 'resume_url',
  'cover_letter', 'driver_licence_classes', 'driver_licence_endorsements', 'contact_id',
] as const

const ALL_STATUSES: CandidateStatus[] = [
  'applied', 'screening', 'shortlisted', 'interview', 'offer', 'rejected', 'sourced',
]

let selectById: Statement | undefined
let insertCandidate: Statement | undefined

/**
 * Hydrates children for a set of candidates with ONE query per child table,
 * regardless of how many candidates there are.
 *
 * The previous build ran ~6 queries per candidate inside a `.map()`, and only
 * attached a key when the array was non-empty — so two candidates in the same
 * response had different shapes. Here every array is always present.
 */
function hydrate(candidates: (Candidate & { job_title?: string | null })[]): CandidateDetail[] {
  const ids = candidates.map((c) => c.id)
  const ph = placeholders(ids.length)

  if (!ph) return []

  const strengths = groupBy(
    db.prepare(
      `SELECT id, candidate_id, title, description FROM candidate_strengths
        WHERE candidate_id IN (${ph}) ORDER BY id`,
    ).all(...ids) as (CandidateStrength & { candidate_id: number })[],
    'candidate_id',
  )

  const experience = groupBy(
    db.prepare(
      `SELECT id, candidate_id, role, organization, period, start_date, end_date, description
         FROM candidate_experience WHERE candidate_id IN (${ph}) ORDER BY id`,
    ).all(...ids) as (CandidateExperience & { candidate_id: number })[],
    'candidate_id',
  )

  const education = groupBy(
    db.prepare(
      `SELECT id, candidate_id, title, institution, status, description
         FROM candidate_education WHERE candidate_id IN (${ph}) ORDER BY id`,
    ).all(...ids) as (CandidateEducation & { candidate_id: number })[],
    'candidate_id',
  )

  const languages = groupBy(
    db.prepare(
      `SELECT id, candidate_id, name, skills FROM candidate_languages
        WHERE candidate_id IN (${ph}) ORDER BY id`,
    ).all(...ids) as (CandidateLanguage & { candidate_id: number })[],
    'candidate_id',
  )

  const skills = groupBy(
    db.prepare(
      `SELECT candidate_id, skill_name, skill_type FROM candidate_skills
        WHERE candidate_id IN (${ph}) ORDER BY id`,
    ).all(...ids) as { candidate_id: number; skill_name: string; skill_type: string | null }[],
    'candidate_id',
  )

  const preferences = new Map(
    (db.prepare(
      `SELECT candidate_id, interested_in, hours, availability, availability_times, location, transport
         FROM candidate_preferences WHERE candidate_id IN (${ph})`,
    ).all(...ids) as (CandidatePreferences & { candidate_id: number })[])
      .map(({ candidate_id, ...prefs }) => [candidate_id, prefs]),
  )

  const nextUp = new Map(
    (db.prepare(
      `SELECT candidate_id, type, date_time FROM candidate_next_up
        WHERE candidate_id IN (${ph})`,
    ).all(...ids) as (CandidateNextUp & { candidate_id: number })[])
      .map(({ candidate_id, ...n }) => [candidate_id, n]),
  )

  const strip = <T extends { candidate_id: number }>(rows: T[] | undefined) =>
    (rows ?? []).map(({ candidate_id: _cid, ...rest }) => rest)

  return candidates.map((c) => {
    const mySkills = skills.get(c.id) ?? []
    return {
      ...c,
      job_title: c.job_title ?? null,
      strengths: strip(strengths.get(c.id)) as CandidateStrength[],
      experience: strip(experience.get(c.id)) as CandidateExperience[],
      education: strip(education.get(c.id)) as CandidateEducation[],
      languages: strip(languages.get(c.id)) as CandidateLanguage[],
      work_skills: mySkills.filter((s) => s.skill_type === 'work').map((s) => s.skill_name),
      other_skills: mySkills.filter((s) => s.skill_type !== 'work').map((s) => s.skill_name),
      preferences: preferences.get(c.id) ?? null,
      next_up: nextUp.get(c.id) ?? null,
    }
  })
}

export function findByJobId(jobId: number, status?: CandidateStatus): CandidateDetail[] {
  const where = ['c.job_id = ?']
  const params: unknown[] = [jobId]
  if (status) {
    where.push('c.status = ?')
    params.push(status)
  }

  const rows = db
    .prepare(`
      SELECT c.*, j.title AS job_title
        FROM candidates c
        JOIN jobs j ON j.id = c.job_id
       WHERE ${where.join(' AND ')}
    ORDER BY c.applied_at DESC, c.id DESC
    `)
    .all(...params) as (Candidate & { job_title: string | null })[]

  return hydrate(rows)
}

/**
 * Every candidate across an account's jobs, in one query.
 *
 * The previous build had no such endpoint, so the dashboard fanned out one
 * request per job through `useQueries` and stitched the results client-side.
 */
export function findByAccount(
  accountId: number,
  filters: { status?: CandidateStatus } = {},
): CandidateDetail[] {
  const where = ['j.account_id = ?']
  const params: unknown[] = [accountId]
  if (filters.status) {
    where.push('c.status = ?')
    params.push(filters.status)
  }

  const rows = db
    .prepare(`
      SELECT c.*, j.title AS job_title
        FROM candidates c
        JOIN jobs j ON j.id = c.job_id
       WHERE ${where.join(' AND ')}
    ORDER BY c.applied_at DESC, c.id DESC
    `)
    .all(...params) as (Candidate & { job_title: string | null })[]

  return hydrate(rows)
}

export function findById(id: number): CandidateDetail | null {
  selectById ??= db.prepare(`
    SELECT c.*, j.title AS job_title
      FROM candidates c
      JOIN jobs j ON j.id = c.job_id
     WHERE c.id = ?
  `)
  const row = selectById.get(id) as (Candidate & { job_title: string | null }) | undefined
  return row ? (hydrate([row])[0] ?? null) : null
}

/** Status counts for a job. Every status is present, zero when unused. */
export function statusCountsByJob(jobId: number): CandidateStatusCounts {
  const rows = db
    .prepare('SELECT status, COUNT(*) AS n FROM candidates WHERE job_id = ? GROUP BY status')
    .all(jobId) as { status: CandidateStatus; n: number }[]

  const counts = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as CandidateStatusCounts
  for (const { status, n } of rows) counts[status] = n
  return counts
}

export function create(
  input: Record<string, unknown> & { job_id: number; email: string },
): CandidateDetail {
  insertCandidate ??= db.prepare(
    'INSERT INTO candidates (job_id, email, status) VALUES (?, ?, ?) RETURNING id',
  )
  const insert = insertCandidate

  const run = db.transaction((): number => {
    const { id } = insert.get(
      input.job_id, input.email, (input.status as string) ?? 'applied',
    ) as { id: number }
    applyUpdate('candidates', id, input, UPDATABLE)
    return id
  })

  return findById(run())!
}

export function update(id: number, input: Record<string, unknown>): CandidateDetail | null {
  applyUpdate('candidates', id, input, UPDATABLE)
  return findById(id)
}

export function updateStatus(id: number, status: CandidateStatus): CandidateDetail | null {
  const changed = db
    .prepare('UPDATE candidates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, id).changes
  return changed > 0 ? findById(id) : null
}

export function remove(id: number): boolean {
  return db.prepare('DELETE FROM candidates WHERE id = ?').run(id).changes > 0
}
