/**
 * Adds extra team members to the seeded employer account, so Manage team has
 * people in it. Idempotent: an email already in ciam is skipped.
 *
 * Runs against data/msd-vd2.db AND data/msd-vd2.seed.db, so `npm run db:reset`
 * keeps the team.
 *
 *   npm run seed:team
 */
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { hashPassword } from '../server/lib/password.ts'

const DEV_PASSWORD = 'password123'
const ACCOUNT_ID = 1
const TARGETS = ['data/msd-vd2.db', 'data/msd-vd2.seed.db']

interface Seed {
  email: string
  first_name: string
  last_name: string
  job_title: string
  phone: string
  employer_role: 'admin' | 'member'
  /** 'pending' people are invited but have not accepted, so they get no login. */
  invitation_status: 'active' | 'pending'
}

const TEAM: Seed[] = [
  { email: 'employer1@test.com', first_name: 'Hana',  last_name: 'Reweti',   job_title: 'Site Manager',         phone: '021 555 0103', employer_role: 'member', invitation_status: 'active' },
  { email: 'employer2@test.com', first_name: 'Tomasi', last_name: 'Fifita',  job_title: 'Foreperson',           phone: '021 555 0104', employer_role: 'member', invitation_status: 'active' },
  { email: 'employer3@test.com', first_name: 'Ruby',  last_name: 'Clarke',   job_title: 'HR Advisor',           phone: '021 555 0105', employer_role: 'admin',  invitation_status: 'active' },
  { email: 'employer4@test.com', first_name: 'Wiremu', last_name: 'Tane',    job_title: 'Health & Safety Lead', phone: '021 555 0106', employer_role: 'member', invitation_status: 'active' },
  { email: 'employer5@test.com', first_name: 'Mere',  last_name: 'Solomon',  job_title: 'Office Administrator', phone: '021 555 0107', employer_role: 'member', invitation_status: 'pending' },
]

for (const path of TARGETS) {
  if (!existsSync(path)) {
    console.log(`skipped ${path} (not found)`)
    continue
  }
  const db = new Database(path)
  const added: string[] = []
  const skipped: string[] = []

  const run = db.transaction(() => {
    for (const person of TEAM) {
      // A pending invite has no ciam row, so ciam alone is not enough to tell
      // whether this person is already on the account.
      const exists = db
        .prepare(`
          SELECT 1 FROM contacts c
            LEFT JOIN ciam m ON m.id = c.ciam_id
           WHERE c.account_id = ? AND (c.invite_email = ? OR m.email = ?)
        `)
        .get(ACCOUNT_ID, person.email, person.email)
      if (exists) {
        skipped.push(person.email)
        continue
      }

      // A pending invite has no login yet, so it gets no ciam row.
      let ciamId: number | null = null
      if (person.invitation_status === 'active') {
        const { hash, salt } = hashPassword(DEV_PASSWORD)

        // Removing a member deletes their contact but leaves the ciam row
        // behind, so the email can already be taken with no profile attached.
        // Reuse that login rather than colliding with it.
        const orphan = db
          .prepare('SELECT id FROM ciam WHERE email = ?')
          .get(person.email) as { id: number } | undefined

        if (orphan) {
          db.prepare('UPDATE ciam SET password_hash = ?, password_salt = ? WHERE id = ?')
            .run(hash, salt, orphan.id)
          ciamId = orphan.id
        } else {
          const row = db
            .prepare(
              'INSERT INTO ciam (email, password_hash, password_salt) VALUES (?, ?, ?) RETURNING id',
            )
            .get(person.email, hash, salt) as { id: number }
          ciamId = row.id
        }
      }

      db.prepare(`
        INSERT INTO contacts
          (ciam_id, domain, employer_role, invitation_status, invite_email,
           account_id, first_name, last_name, phone, job_title)
        VALUES (?, 'employer', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        ciamId,
        person.employer_role,
        person.invitation_status,
        person.email,
        ACCOUNT_ID,
        person.first_name,
        person.last_name,
        person.phone,
        person.job_title,
      )
      added.push(person.email)
    }
  })
  run()

  // Fold the WAL back into the file itself, or the committed .db misses this.
  db.pragma('wal_checkpoint(TRUNCATE)')
  const total = db
    .prepare("SELECT COUNT(*) AS n FROM contacts WHERE account_id = ? AND domain = 'employer'")
    .get(ACCOUNT_ID) as { n: number }
  db.close()

  console.log(`${path}: added ${added.length}, skipped ${skipped.length}, team now ${total.n}`)
}

console.log(`\nNew logins use the password: ${DEV_PASSWORD} (pending invites have none)`)
