# Database and API

SQLite via `better-sqlite3`, behind an Express API that exists **under `npm run dev` only**.

---

## The layers, in order

Every data change moves through all five. Never skip one.

| Layer | Lives in | Responsibility |
|---|---|---|
| Schema | `server/schema/*.sql` | Tables, constraints, indexes |
| Types | `server/types.ts` | The row shapes |
| Repository | `server/repositories/*.ts` | **All SQL.** Business rules that protect data integrity |
| Route | `server/routes/*.ts` | HTTP shape, parsing, status codes |
| Client | `src/modules/data/api/api.ts` | The only thing a component calls |

**A component never reaches the database, and never calls `fetch` directly.** It imports
`data/api`.

Routers are mounted in `scripts/dev-server.ts`. Order matters there — `/api` must be mounted
*before* `app.init()`, or LWR's catch-all answers first and returns the HTML shell instead of JSON.
Mount through `app.getInternalServer<'express'>()`, never `LwrApp.use()`.

## Writes go through an allow-list

Each repository declares which columns may be written:

```ts
const ACCOUNT_UPDATABLE = ['company_name', 'industry', …] as const
const CONTACT_UPDATABLE = ['first_name', 'last_name', 'phone', 'job_title', …] as const
```

`applyUpdate(table, id, updates, allowedFields)` writes **only** keys that appear in both the
payload and the allow-list.

Two consequences worth stating plainly:

- **A field absent from the payload is left alone, not nulled.** This is what makes it safe to drop
  a field from a form without wiping its column.
- **The allow-list is the authority, not the form.** `id`, `ciam_id` and `domain` cannot be changed
  through a profile PATCH however the request is shaped.

Never widen an allow-list to make a screen work. If a screen needs a field the allow-list excludes,
that is a decision to raise, not to patch around.

## Business rules belong in the repository or the route

The UI hiding an action is a convenience, not a control. Anything that protects integrity is
enforced server-side as well:

| Rule | Enforced in |
|---|---|
| The primary contact cannot be removed | `account-repository.removeMember` → `DomainError` |
| The primary contact must stay an Admin | `routes/accounts.ts` role handler → 400 |
| A login with no contact cannot sign in | `auth-repository.login` → `AuthError` |

`DomainError` from a repository means the caller was wrong → map to 400. Anything else is a real
error → let it reach the error handler.

## Error contract

Every failure is `{ "error": string }` with a real status code. `data/api` reads that shape:

```ts
if (!contentType.includes('application/json')) {
    throw new ApiError(response.status, 'Live data is not available in this build.');
}
```

A non-JSON response means *no API in this build*, not a bad request — see `rules-architecture.md`.

## Generic table CRUD

`/api/admin/*` (`server/routes/admin.ts`, `server/lib/admin-tables.ts`) exposes every table
generically for the `/data` screen, which builds its grid and forms from
`GET /api/admin/schema`. Sensitive columns are excluded there:

```ts
ciam: ['password_hash', 'password_salt']
```

`/data` is a development tool. Do not build product screens on `/api/admin/*` — give the feature a
real repository and route.

---

## The two database files

| File | Role |
|---|---|
| `data/msd-vd2.db` | The working database. **Committed.** |
| `data/msd-vd2.seed.db` | Pristine copy. `npm run db:reset` restores from it |

Both are tracked by git. A script that changes seeded data must write to **both**, or
`npm run db:reset` silently undoes it.

### WAL — the trap

The working database runs in WAL mode. Writes land in `data/msd-vd2.db-wal` (gitignored), **not in
the `.db` file**, so `git status` shows no change even though the data did change. A fresh clone
would then get the old data.

After any script or test that writes, checkpoint:

```js
db.pragma('wal_checkpoint(TRUNCATE)')
```

Then confirm `git status` reflects reality.

### Seed scripts

| Script | Does |
|---|---|
| `npm run db:reset` | Restore the working database from the seed |
| `npm run auth:dev-passwords` | Give every seeded `ciam` row the known dev password |
| `npm run seed:team` | Put the extra team members on account 1 |

Both seed scripts are **idempotent** and write to both database files. Idempotency has a sharp
edge worth knowing: a `pending` contact has no `ciam` row, so checking `ciam` alone is not enough
to tell whether a person already exists — check `contacts` by `invite_email`. And removing a member
deletes the contact but leaves the `ciam` row, so an email can be taken with no profile behind it;
`seed-team.ts` reuses such a row rather than colliding with its unique constraint.

### Testing against real data

Testing writes to the committed database. Treat that as borrowed:

1. Capture the values you are about to change.
2. Run the test.
3. Restore them, checkpoint the WAL, and confirm with `git status`.

If restoration gets complicated, `npm run db:reset` is the clean exit — the seed is the authority.

---

## Schema shape

Identity is `ciam` → `contacts` → `accounts`:

- **`ciam`** — login credentials, one row per user. `email` is unique. scrypt hash + salt.
- **`contacts`** — people. `ciam_id` is null until they have a login. `domain` splits `employer`
  from `client`. `invitation_status` is `active` (portal user), `pending` (invited, not accepted —
  **no login yet**) or `none` (a real person we hold details for who is not a portal user, excluded
  from Manage team).
- **`accounts`** — employer organisations. `contact_id` is the primary contact, `secondary_contact_id`
  the backup.

Then `jobs` → `candidates`, each with child tables (`job_skills`, `candidate_experience`, …) keyed
by the parent id. A repository fetching a record with children does **one query per child table**
and joins in JS — not one query per child row.

Booleans are `INTEGER`, JSON arrays are `TEXT`. `toAccount` / `updateAccount` convert at the
repository boundary so callers see real types. Keep that boundary: a route or component should
never see `0`/`1` for a boolean.
