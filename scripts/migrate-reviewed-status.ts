/**
 * Adds the `reviewed` vacancy status, and one seeded vacancy in it.
 *
 * `reviewed` = MSD has reviewed the listing and changed it; the employer must
 * accept the changes (Publish job) before it goes live. It reads as "Changes to
 * review" and sits under the In review filter. Lifecycle:
 *   draft -> in_review -> reviewed -> active -> closed
 *
 * Two steps, both idempotent, run against data/msd-vd2.db AND
 * data/msd-vd2.seed.db so `npm run db:reset` keeps them:
 *
 *   1. Widen the CHECK on `jobs.status`. SQLite cannot alter a CHECK, so the
 *      table is rebuilt: new table, copy, drop, rename, re-create its indexes.
 *      Foreign keys are switched OFF for the rebuild — every child table
 *      (skills, schedule, candidates…) references jobs ON DELETE CASCADE, and
 *      dropping the old table with them on would empty all of them. A
 *      `foreign_key_check` must come back clean before the commit.
 *   2. Seed "Administrator assistant" (the designs' example, Figma 570:102296)
 *      in `reviewed`, copied from an existing seeded vacancy with its child
 *      rows — not its candidates. Skipped when it already exists.
 *
 *   npx tsx scripts/migrate-reviewed-status.ts
 */
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'

const TARGETS = ['data/msd-vd2.db', 'data/msd-vd2.seed.db']
const OLD_CHECK = "CHECK (status IN ('draft', 'in_review', 'active', 'closed'))"
const NEW_CHECK = "CHECK (status IN ('draft', 'in_review', 'reviewed', 'active', 'closed'))"

const SEED_TITLE = 'Administrator assistant'
/** The vacancy the seed copies its content from: the draft "Site Foreperson". */
const SOURCE_JOB_ID = 4

/** Child tables keyed by job_id, copied with the vacancy. Candidates are not. */
const CHILD_TABLES = [
  'job_responsibilities', 'job_selling_points', 'job_pre_employment_checks',
  'job_employer_values', 'job_skills', 'job_certificates', 'job_schedule',
  'job_schedule_days', 'job_driver_licences', 'job_licence_endorsements',
]

type Row = Record<string, unknown>

function columns(db: Database.Database, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name)
}

function widenCheck(db: Database.Database): string {
  const { sql } = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='jobs'").get() as { sql: string }
  if (sql.includes("'reviewed'")) return 'status check already allows reviewed'
  if (!sql.includes(OLD_CHECK)) throw new Error('jobs.status CHECK is not the expected one — stopping.')

  const indexes = (db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='jobs' AND sql IS NOT NULL").all() as { sql: string }[]).map((r) => r.sql)
  const cols = columns(db, 'jobs').join(', ')

  db.pragma('foreign_keys = OFF')
  try {
    db.transaction(() => {
      db.exec(sql.replace('CREATE TABLE jobs', 'CREATE TABLE jobs_new').replace(OLD_CHECK, NEW_CHECK))
      db.exec(`INSERT INTO jobs_new (${cols}) SELECT ${cols} FROM jobs`)
      db.exec('DROP TABLE jobs')
      db.exec('ALTER TABLE jobs_new RENAME TO jobs')
      for (const ix of indexes) db.exec(ix)
      const broken = db.pragma('foreign_key_check') as unknown[]
      if (broken.length) throw new Error(`foreign_key_check failed: ${JSON.stringify(broken)}`)
    })()
  } finally {
    db.pragma('foreign_keys = ON')
  }
  return 'status check widened to include reviewed'
}

function seedReviewedJob(db: Database.Database): string {
  if (db.prepare('SELECT id FROM jobs WHERE title = ? AND status = ?').get(SEED_TITLE, 'reviewed')) {
    return `"${SEED_TITLE}" already seeded`
  }
  const src = db.prepare('SELECT * FROM jobs WHERE id = ?').get(SOURCE_JOB_ID) as Row | undefined
  if (!src) return `source job ${SOURCE_JOB_ID} not found — seed skipped`

  return db.transaction(() => {
    const jobCols = columns(db, 'jobs').filter((c) => !['id', 'created_at', 'updated_at'].includes(c))
    const values: Row = { ...src, title: SEED_TITLE, status: 'reviewed', external_job_id: `${src.external_job_id ?? 'job'}-R` }
    const info = db.prepare(
      `INSERT INTO jobs (${jobCols.join(', ')}) VALUES (${jobCols.map(() => '?').join(', ')})`,
    ).run(...jobCols.map((c) => values[c] ?? null))
    const newId = Number(info.lastInsertRowid)

    for (const table of CHILD_TABLES) {
      const cols = columns(db, table).filter((c) => c !== 'id' && c !== 'job_id')
      db.prepare(
        `INSERT INTO ${table} (job_id, ${cols.join(', ')}) SELECT ?, ${cols.join(', ')} FROM ${table} WHERE job_id = ?`,
      ).run(newId, SOURCE_JOB_ID)
    }

    // Languages carry their abilities by language id, so map old -> new.
    const langs = db.prepare('SELECT id, language_name FROM job_languages WHERE job_id = ?').all(SOURCE_JOB_ID) as { id: number; language_name: string }[]
    for (const l of langs) {
      const newLang = Number(db.prepare('INSERT INTO job_languages (job_id, language_name) VALUES (?, ?)').run(newId, l.language_name).lastInsertRowid)
      db.prepare('INSERT INTO job_language_abilities (language_id, ability) SELECT ?, ability FROM job_language_abilities WHERE language_id = ?').run(newLang, l.id)
    }
    return `seeded "${SEED_TITLE}" as job ${newId} (copied from job ${SOURCE_JOB_ID})`
  })()
}

for (const path of TARGETS) {
  if (!existsSync(path)) {
    console.log(`skipped ${path} (not found)`)
    continue
  }
  const db = new Database(path)
  try {
    console.log(`${path}: ${widenCheck(db)}; ${seedReviewedJob(db)}`)
    db.pragma('wal_checkpoint(TRUNCATE)')
  } finally {
    db.close()
  }
}
