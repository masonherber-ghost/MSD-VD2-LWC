/**
 * Gives the seeded logins a known password.
 *
 * The seed database shipped with scrypt hashes whose source password is not
 * recorded anywhere, so nobody can sign in as the demo users. This rewrites
 * both seeded ciam rows with DEV_PASSWORD, using the same hashing the auth
 * routes verify with.
 *
 * Runs against data/msd-vd2.db AND data/msd-vd2.seed.db, so `npm run db:reset`
 * does not put the unknown hashes back.
 *
 *   npm run auth:dev-passwords
 */
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { hashPassword } from '../server/lib/password.ts'

const DEV_PASSWORD = 'password123'
const TARGETS = ['data/msd-vd2.db', 'data/msd-vd2.seed.db']

for (const path of TARGETS) {
  if (!existsSync(path)) {
    console.log(`skipped ${path} (not found)`)
    continue
  }
  const db = new Database(path)
  const rows = db.prepare('SELECT id, email FROM ciam').all() as { id: number; email: string }[]
  const update = db.prepare('UPDATE ciam SET password_hash = ?, password_salt = ? WHERE id = ?')

  const run = db.transaction(() => {
    for (const row of rows) {
      const { hash, salt } = hashPassword(DEV_PASSWORD)
      update.run(hash, salt, row.id)
    }
  })
  run()

  console.log(`${path}: set password for ${rows.map((r) => r.email).join(', ')}`)
  db.close()
}

console.log(`\nDev password for every seeded login: ${DEV_PASSWORD}`)
