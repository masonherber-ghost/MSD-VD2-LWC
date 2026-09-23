import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// The database lives in data/ at the repo root, outside src/, so LWR never
// tries to treat it as a module or a static asset.
export const DB_PATH = process.env.DB_PATH ?? path.join(here, '..', 'data', 'msd-vd2.db')

// Writable: the /data screen edits rows. The committed .db therefore changes as
// you use the app — that is the point, but it does mean `git diff` will show it.
// `npm run db:reset` restores the seeded copy.
export const db = new Database(DB_PATH)

// WAL gives better concurrent reads. It creates -wal/-shm sidecars next to the
// database; both are gitignored.
db.pragma('journal_mode = WAL')

// foreign_keys is OFF by default in SQLite, so a REFERENCES ... ON DELETE
// CASCADE would silently do nothing — and the /data screen relies on cascades
// behaving as the schema describes.
db.pragma('foreign_keys = ON')
