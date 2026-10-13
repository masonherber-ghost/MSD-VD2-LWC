# App logic — the business rules

The product rules this prototype implements. Changing one of these is a product decision: raise it,
do not quietly alter it.

---

## Auth is a prototype, and says so

**Passwords are verified properly. Sessions are not.**

| Half | How |
|---|---|
| Password | scrypt + per-user salt, compared with `timingSafeEqual` (`server/lib/password.ts`) — the scheme `ciam` was designed for |
| Session | The user record in `localStorage` (`src/modules/data/session`). **No token, no cookie, no server-side session.** Every `/api` route is open |

Anyone can forge a session by editing `localStorage`. This exists to prototype the *flow* — sign
in, an authenticated shell, edit your profile, sign out — not to secure anything. Both files say so
at the top. **Keep those notices.** If auth is ever made real, they are the checklist.

Do not add a "protected route" that only checks the client session and call it access control.

### Rules

- **Login failure is deliberately vague.** An unknown email and a wrong password return the same
  message, so the form cannot be used to enumerate accounts. Keep it that way.
- **Email is normalised** — trimmed and lowercased — before lookup.
- **A `ciam` row with no contact cannot sign in.** Every screen is scoped by contact and account,
  so a login with nothing behind it has nowhere to go.
- **Registration** creates the `ciam` row, the `contacts` row behind it, and — when a company name
  is given — the `accounts` row they become primary contact for. A self-registering employer is the
  first person on a new account.
- **Minimum password length is 8**, enforced server-side. The client mirrors it for feedback only.

## Account scoping

Screens read `account_id` from the session, falling back to `DEV_ACCOUNT_ID`:

```ts
await api.jobs(currentAccountId() ?? DEV_ACCOUNT_ID)
```

A newly registered employer therefore sees their own empty account, not the seeded one. The
fallback keeps the data screens demoable while signed out — it is a prototype convenience, not an
authorisation model.

## Navigation has two forms

| | Signed out | Signed in |
|---|---|---|
| Main nav | *hidden* | List a job · My jobs · Help centre |
| Right side | Login | avatar → My profile · Manage org · Log out |
| Homepage | The pitch, with the ways in | The employer's landing pad |

`ui/siteHeader` subscribes to session changes, so signing in or out re-renders the shell without a
reload — including in another tab, via the `storage` event.

A screen that has no meaning signed out (`/profile`, `/manage-org`) renders a "Log in to …" state,
not a blank form.

---

## Manage org

### Fields MSD holds

`company_name`, `industry`, `company_type` (labelled **Org type** in the UI), `ird_number` and
`nzbn` are MSD's record. An employer cannot edit them — **but a blank one can be filled in once**,
because empty means nothing has been recorded yet. The moment it holds a value, it locks.

Three things make that work, and all three matter:

1. **Lock state is read from the saved account, never the draft.** Typing into an empty field must
   not lock it mid-edit.
2. **A locked field renders as read-only output** (`slds-form-element__static`), not as a disabled
   input. That is how Lightning shows a value you cannot change, and it keeps every locked field
   looking the same. A read-only `lightning-combobox` renders as a grey box while a read-only
   `lightning-input` renders as plain text, so mixing the two looks broken. An empty read-only
   value shows an em dash rather than blank space.
3. **`toPayload` omits locked fields entirely**, so a tampered DOM cannot overwrite one.

A locked field showing a slug must display its **label** — `registered_company` → "Registered
company".

### Editing arrived in 1.2

Before 1.2 the whole org form was read-only — `manageOrg.editDetails` gates it, and `isLocked`
returns true for every field when it is off, so the same read-only rendering covers both rules.
The Save/Cancel footer goes with it. **Manage team** is gated separately by `manageOrg.team`, also
at 1.2.

### Verification

`verified` is in `ACCOUNT_UPDATABLE` but is **not on the form**. It appears as a badge in the page
header only. An employer verifying themselves would defeat its purpose. Do not add it to the form.

### The primary contact

The primary contact carries the account's authority. Two rules follow:

- **They must stay an Admin.** No "Change to Member" action, and the server refuses the demotion.
- **They cannot be removed.** No "Remove from team" action, and `removeMember` throws a
  `DomainError`.

That leaves them with no actions at all, and an empty menu reads as broken — so the row menu holds
one **disabled** line saying why: *"Primary contact must stay an Admin"*.

**Making a Member the primary contact promotes them to Admin on the way in**, rather than leaving
them in a state the rules forbid. The confirmation message says both things happened.

Primary and secondary move together (`setAuthorisedContact`): promoting someone demotes the current
holder to secondary, in one write, so the pair can never be half-applied.

### Removal is confirmed

Removing a team member is destructive and takes a second, explicit confirmation before the call is
made. Note the known gap in `rules-database.md`: removal orphans the `ciam` row.

---

## Applicants are anonymised

`candidates` rows carry `initials` and an email, never a name. Where a name is needed for display,
it is derived from the email's local part — `sione.taufa@email.com` → "Sione Taufa". That is a
presentation convenience over anonymised data. If applicant anonymity is deliberate product policy,
this is the line to change.

## Vacancy lifecycle

`draft` → `in_review` → `reviewed` → `active` → `closed`.

`reviewed` means MSD has reviewed the listing **and changed it**: the employer must look at the
changes and accept them with **Publish job** on the record page (`POST /api/jobs/:id/publish`, which
only accepts `reviewed` and moves it to `active`). It reads "Changes to review" with a warning
badge and notice, and sits under the **In review** filter. Added by
`npm run db:migrate-reviewed` (`scripts/migrate-reviewed-status.ts`), which widened the
`jobs.status` CHECK in both database files and seeded one vacancy in the state.

Candidate statuses, in pipeline order: `applied`, `screening`, `shortlisted`, `interview`, `offer`,
`rejected`, `sourced`.

`interview_options` uses the slugs the `jobs` table already uses — `in-person`, `phone`, `online` —
so job and account stay consistent. `pre_employment_checks` is free text, edited one per line.

## Release preview — the feature flag

`src/modules/data/release` gates screens and widgets by release, so variants can be compared
without branching the code. The toggle lives in `ui/siteFooter`, docked on every route.

| Piece | Where |
|---|---|
| Releases, registry, `isEnabled` | `src/modules/data/release/release.ts` |
| The toggle | `src/modules/ui/siteFooter/` |

Releases are `1.1`, `1.2`, `1.3`, `1.4`, `2+`. The default is **`2+`** — the newest — so the site
shows its full current state and stepping *back* is what reveals how it was built up.

It is stored under its own key (`msd.release`), not inside the session: the session is who you are
and is cleared on sign-out; the release is which build you are previewing and must outlive it.

### Flags are cumulative

`FEATURES` maps each feature to **the release it lands in**. `isEnabled` asks *has the selected
release reached that one*, never *does it equal it*. A feature at `1.2` is on for 1.2, 1.3, 1.4 and
2+.

Two variants of the same widget are therefore two flags landing in different releases — not an
equality check. Reach for `isRelease` only when something genuinely exists in one release alone.

An **unregistered** flag is treated as ON with a console warning, so a typo is loud rather than
silently blanking a screen.

### Consuming a flag — the reactivity rule

This is the part that bites. **LWC re-renders only when a field it read during the last render
changes.** A getter that calls `isEnabled('x')` reads the *module*, not a field, so LWC records no
dependency and the screen does not update when the toggle moves — it only looks right after a
reload.

So a component holds the release in a field and passes it in:

```ts
release: Release = currentRelease();
private unsubRelease: (() => void) | null = null;

connectedCallback(): void {
    this.unsubRelease = onReleaseChange(() => {
        this.release = currentRelease();
    });
}

disconnectedCallback(): void {
    this.unsubRelease?.();
    this.unsubRelease = null;
}

get showActivity(): boolean {
    return isEnabled('jobDetail.activityTimeline', this.release);
}
```

Passing `this.release` is not decoration — it is what makes the field a render dependency.

### Gate the whole widget

A flag must hide the **entire** widget, not just its contents. Gating the inside of a
`lightning-card` leaves an empty card with its "nothing here yet" state showing, which reads as a
bug rather than as a feature that does not exist yet.

### The registry is placeholder

The release assignments in `FEATURES` are **not a real roadmap** — they were set to demonstrate the
mechanism. Correct them against the actual plan before using them to make decisions.

## Never invent data

Every number, date and name on a screen comes from the database. The activity timeline on the
record page is built from real application dates; the pipeline counts come from
`statusCountsByJob`. If a design calls for something the data does not hold, say so — do not
fabricate a plausible value to fill the space.
