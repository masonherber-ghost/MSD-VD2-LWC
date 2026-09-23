# Schema reference

`002_recruitment_schema.sql` is the consolidated baseline that produced
`data/msd-vd2.db` — kept here because it is the clearest description of the 25-table
recruitment domain, with the design decisions written into its comments.

It is **not wired up to anything.** The API opens the database read-only
(`server/database.ts`), so this SQL cannot be applied through it. Rebuilding the
database from scratch means a writable connection and the seed data, which still
lives in `_reference/server/db/seed-data.ts` and targets `better-sqlite3` directly.
