/**
 * Adds `contacts.first_time` — 1 until the person has seen the first-time
 * welcome page (`/welcome`), then 0. Existing contacts get 1, so every seeded
 * user sees the welcome page once.
 *
 * Idempotent, and run against data/msd-vd2.db AND data/msd-vd2.seed.db so
 * `npm run db:reset` keeps the column — and resets everyone to first-time,
 * which is the way to replay the welcome page in a demo (or set the value back
 * to 1 on /data).
 *
 *   npm run db:migrate-first-time
 */
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'

const TARGETS = ['data/msd-vd2.db', 'data/msd-vd2.seed.db']

for (const path of TARGETS) {
  if (!existsSync(path)) {
    console.log(`skipped ${path} (not found)`)
    continue
  }
  const db = new Database(path)
  try {
    const cols = (db.prepare('PRAGMA table_info(contacts)').all() as { name: string }[]).map((c) => c.name)
    if (cols.includes('first_time')) {
      console.log(`${path}: contacts.first_time already present`)
    } else {
      db.exec('ALTER TABLE contacts ADD COLUMN first_time INTEGER NOT NULL DEFAULT 1')
      console.log(`${path}: added contacts.first_time (existing rows = 1)`)
    }
    db.pragma('wal_checkpoint(TRUNCATE)')
  } finally {
    db.close()
  }
}
