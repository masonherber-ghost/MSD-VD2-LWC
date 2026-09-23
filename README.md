# MSD Component Library (LWR + Lightning base components + SLDS 2)

A standalone prototype site for designing against the Salesforce Lightning look and
feel — no Salesforce org, no deploy, no authentication. It runs as a plain
[LWR](https://developer.salesforce.com/docs/platform/lwr/overview) site with the
open-source Lightning base components installed as an npm dependency.

## What's wired up

| Concern | Package | Notes |
| --- | --- | --- |
| Framework | `lwc` | Kept in step with the compiler LWR bundles (see *Version pinning*) |
| Dev server / SSG | `lwr` | `npm run dev`, `npm run build` |
| Components | `lightning-base-components` | 84 exposed `lightning-*` components |
| Styling | `@salesforce-ux/design-system-2` | SLDS 2, Lightning Blue theme |
| Data (dev only) | `better-sqlite3` | API over `data/msd-vd2.db` |

> `github.com/salesforce/lwc` is the LWC **framework** and ships no `lightning-*`
> components. The base components live in `lightning-base-components`, which is
> what this project installs.

## Routes

| Path | Component | What it is |
| --- | --- | --- |
| `/` | `example/home` | Homepage stub — replace with real content |
| `/jobs` | `example/jobs` | Vacancy listing — a card grid, live from SQLite |
| `/jobs/job-detail?id=N` | `example/jobDetail` | Lightning **record page** for one vacancy |
| `/list-a-job` | `example/listAJob` | Nav destination, not built yet |
| `/help-centre` | `example/helpCentre` | Nav destination, not built yet |
| `/employer-profile` | `example/employerProfile` | Nav destination, not built yet |
| `/manage-org` | `example/manageOrg` | Nav destination, not built yet |
| `/vacancies` | `example/vacancies` | First data-backed screen — live from SQLite |
| `/data` | `example/data` | Every table in the database, with create/edit/delete |
| `/design-system` | `example/designSystem` | The kitchen sink: every shipped example, live |

Every route shares `ui/siteHeader` and the layout in `src/layouts/main.njk`. Add a
route by adding an entry to `routes` in `lwr.config.json` and a matching
component; `npm run catalog` never touches that part of the config.

The global header carries the three main nav links (List a job, My jobs, Help
centre) and a profile menu (Employer profile, Manage org). `/vacancies`, `/data`
and `/design-system` are development screens, reached from the App Launcher
waffle rather than the main nav.

### The record page layout

`example/jobDetail` is the reference for Lightning Experience page anatomy, composed
entirely from SLDS 2 blueprints and shipped base components — nothing custom:

| Region | Built from |
| --- | --- |
| Highlights panel | `slds-page-header` + `__row` / `__col-title` / `__col-actions` / `__detail-block` |
| Record switcher | `slds-page-header__name-switcher` + `lightning-button-menu` |
| Path chevron | `lightning-progress-indicator type="path"` + `lightning-progress-step` |
| 2:1 split body | `lightning-layout` + `lightning-layout-item` (`size="12" large-device-size="8"` / `"4"`) |
| Main region | `lightning-tabset variant="scoped"` — Details form, Applicants datatable |
| Sidebar region | `lightning-card` — pipeline, activity, vacancy contact |

> SLDS 2 dropped the `slds-page-header_record-home` modifier. Use the base
> `slds-page-header` with the row/column classes above instead.

The record shown is taken from `?id=`, falling back to the account's first
vacancy when it is missing or unknown. The record switcher rewrites the URL with
`history.pushState`, so any vacancy reached by switching stays linkable.

### The listing layout

`example/jobs` is the object home for vacancies: an
`slds-page-header_object-home` header over a responsive `lightning-card` grid
(`lightning-layout-item size="12" medium-device-size="6" large-device-size="4"`).
Each card links through to the record page. `/vacancies` renders the same data as
a `lightning-datatable` instead, so the two list patterns can be compared.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000 — site + /api
npm run dev:lwr  # site only, no database (plain `lwr dev`)
npm run db:reset # restore the database from data/msd-vd2.seed.db
npm run build    # static build into ./site (no /api)
npm run start    # serve the built site
npm run catalog  # regenerate the catalog + example registry (see below)
```

## How the wiring works

### Components

`lightning-base-components` ships its own `lwc.modules` config declaring both its
component directory and stubs for every `@salesforce/*` platform import
(labels, i18n, feature flags). LWR consumes all of that through one entry in
`lwr.config.json`:

```json
"lwc": {
    "modules": [
        { "dir": "$rootDir/src/modules" },
        { "npm": "lightning-base-components" }
    ]
}
```

No per-component registration is needed. Any of the 84 components can be dropped
into a template and LWR resolves it:

```html
<lightning-card title="Account" icon-name="standard:account">
    <lightning-input label="Name"></lightning-input>
    <lightning-button variant="brand" label="Save"></lightning-button>
</lightning-card>
```

Icons are inlined as LWC templates inside the package — there is no SLDS icon
sprite to host or configure.

### Styling

The SLDS 2 bundle is served as a static asset and linked from a custom layout:

- `lwr.config.json` maps `@salesforce-ux/design-system-2/dist/css/bundled` to `/public/slds`
- `src/layouts/main.njk` links `slds2.lightning-blue.css` and is set as the route's `layoutTemplate`

Swap the stylesheet in that layout to change theme — `slds2.cosmos.css` is the
other bundled theme, and `dist/css/modular/` has base + theme layers separately.

Note that the layout is Nunjucks, so it uses `{{ body | safe }}`, **not** the
`{{{body}}}` syntax of LWR's built-in default layout.

### Light DOM

Site chrome (`example/app`, `ui/*`, `gallery/*`) sets `static renderMode = 'light'`.
Global SLDS utility classes cannot cross a shadow boundary, so any component of
ours that uses `slds-*` classes must be light DOM. The base components are
unaffected — they bundle their own styles.

## The kitchen sink (`/design-system`)

`lightning-base-components` ships 255 official example bundles in `__examples__`
folders — the same ones behind Salesforce's hosted Component Library. The
**Kitchen sink** page is a Storybook-style browser over them: pick a component,
pick an example, see it run, read its real source. 239 of the 255 are usable
here; the rest belong to components this site does not expose.

Nothing about the examples is re-authored. Each one is registered as an LWC
module pointing straight at the file in `node_modules`, loaded lazily and mounted
with `lwc:is`:

```html
<lwc:component lwc:is={ctor}></lwc:component>
```

The UI wrapper is deliberately thin — two components, no story files to write,
nothing to update when the package changes:

| File | Lines | Job |
| --- | --- | --- |
| `ui/kitchenSink` | ~190 | component list, filter, example picker, hash deep-links |
| `ui/exampleStage` | ~120 | lazy-mounts one example, shows its source |

Deep links work: `/design-system#datatable/withRowActions` opens that example
directly.

Adding examples is not a code change. Upgrade the package, run `npm run catalog`,
and any new examples appear.

## The data layer (dev only)

`data/msd-vd2.db` is a 295KB SQLite database salvaged from `_reference/`, an
abandoned React attempt at the same product: an MSD recruitment domain of 25 tables
(1 account, 2 contacts, 4 vacancies, 9 candidates with their skills, experience and
education). The schema, repositories and route handlers came across with it; the
React/Refine UI did not.

**`npm run dev` serves the site and the API on one port.** `scripts/dev-server.ts`
boots LWR through its programmatic `createServer()` and mounts an Express router at
`/api` before `init()`:

```ts
const app = createServer({ serverMode: 'dev' });
app.getInternalServer<'express'>().use('/api', api);   // BEFORE init()
await app.init();
```

Two things there are load-bearing:

- **`getInternalServer()`, not `LwrApp.use()`.** `LwrApp`'s `use/get/post` wrap the
  handler and call it with LWR's own `ExpressRequest`/`ExpressResponse` shims, which
  have no `res.json` — an Express router handed those never responds and the request
  hangs. `LwrApp.use()` also takes a single middleware argument, so a path prefix is
  silently dropped. `getInternalServer()` returns the raw Express 4 app LWR bundles.
- **Before `init()`.** LWR attaches its catch-all view middleware there, and Express
  matches in registration order.

### Endpoints

All return bare payloads (list → array, item → object) with `{ "error": "…" }` on
failure. The domain endpoints are read-only; `/api/admin/*` is read-write and backs
the `/data` screen.

| Method | Path |
| --- | --- |
| GET | `/api/health` |
| GET | `/api/jobs?account_id=&status=&contact_id=` (`account_id` required) |
| GET | `/api/jobs/:id` (full detail, child collections hydrated) |
| GET | `/api/candidates?account_id=&status=` |
| GET | `/api/candidates/job/:jobId`, `/api/candidates/job/:jobId/status-counts` |
| GET | `/api/candidates/:id` |
| GET | `/api/accounts/:id`, `/api/accounts/:id/members` |
| GET | `/api/admin/schema` — the registry every `/data` grid and form is built from |
| GET | `/api/admin/:table?_start=&_end=&_sort=&_order=&q=` → `{ data, total }` |
| GET/POST/PATCH/DELETE | `/api/admin/:table[/:id]` |

### Consuming it from LWC

`src/modules/data/api/api.ts` is the only place that talks to `/api`:

```ts
import api, { ApiError, DEV_ACCOUNT_ID } from 'data/api';
const jobs = await api.jobs(DEV_ACCOUNT_ID);
```

**Every caller must handle the rejection.** The static build has no `/api` — LWR
answers with its HTML 404 — so the client treats a non-JSON response as "no API in
this build" and throws `ApiError`. `example/vacancies` shows the pattern: it renders
"Live data is not available in this build" instead of failing. An unhandled rejection
here is the one way this breaks `npm run build`.

## The /data screen

A schema-driven browser over **every** table: pick a table, page and sort it, search
it, and create, edit or delete rows.

**Nothing in the UI knows about jobs or candidates.** The server publishes its
registry at `/api/admin/schema` and `ui/dataBrowser` builds the table list, grid
columns and row actions from it; `ui/dataForm` builds its fields from each table's
`editable` spec. Adding a table or a column to the screen means changing the
database, not this code.

`server/lib/admin-tables.ts` derives that registry by introspecting SQLite —
`table_info`, `foreign_key_list` and the stored `CREATE TABLE` text — rather than
hand-listing tables. That is what makes all 26 appear, and it also gives the form
its behaviour for free:

- a column with `CHECK (col IN (…))` renders as a **dropdown** of exactly those values
- a foreign key renders as a numeric field, and an empty one saves as `NULL`, not `0`
- `description`/`summary`/`about`-style columns render as **textareas**
- `NOT NULL` with no default becomes **required**

On top of that sit deliberate narrowings, all in the same file:

| Rule | Why |
| --- | --- |
| `ciam.password_hash` / `password_salt` never selected | Credentials must not reach the client |
| `ciam` not creatable | Creating a login means hashing a password — that belongs in an auth flow |
| `migrations` read-only | It is the migration runner's own bookkeeping |
| `created_at` / `updated_at` never editable | Written by the database |

**Safety.** Every identifier that reaches SQL is resolved through the registry first,
so an undeclared column name becomes a `400` rather than a fragment of a query; values
are always bound parameters. SQLite constraint failures are mapped to real statuses
(`CHECK`/`FK`/`NOT NULL` → 400, `UNIQUE` → 409) and shown on the form, so a bad value
does not blank the screen.

**Deletes report what they actually took.** The static warning lists the child tables
from the foreign keys, but a cascade runs deeper than that — deleting a job also
removes rows from the `candidate_*` tables via `candidates`. The server therefore
diffs every table's row count around the delete and returns the real numbers, which
the screen shows afterwards.

**Writing is on.** The connection is read-write and `data/msd-vd2.db` is committed, so
editing rows changes a tracked file and `git diff` will show it. `data/msd-vd2.seed.db`
is the pristine copy; `npm run db:reset` restores it.

### Things to know

- **The domain repositories still contain their write functions.** They are
  unreachable — only the GET routes are mounted for jobs/candidates/accounts — so
  exposing them later is re-adding a route, not re-porting a file. `/data` writes go
  through the separate generic admin repository.
- **There is no authentication or authorisation at all.** Any caller can pass any
  `account_id`. That is only acceptable because the API exists under `npm run dev`;
  do not mount it in `lwr start` or put it on a network as-is.
- **`server/` is not watched.** LWR's HMR covers `src/`; editing a repository or route
  needs a restart.
- `_reference/` is gitignored — it is its own git repo and 522MB. It stays on disk as
  the source for anything else worth salvaging (seed data, the admin-table registry).

## The catalog

`npm run catalog` reads the installed package and writes four things:

| Output | Contents |
| --- | --- |
| `src/modules/data/catalog/catalog.js` | 84 components: tag, module, API version, properties, slots, examples |
| `src/modules/data/exampleRegistry/exampleRegistry.js` | a lazy `() => import(...)` per example |
| `src/assets/example-sources.json` | example source, fetched on demand (~475KB) |
| `lwr.config.json` | the `examples/*` module records and bundle exclusions |

It only rewrites the parts it owns in `lwr.config.json`, so routes and assets
there are safe to edit by hand.

A module counts as a usable component when it is marked `isExposed` in its
`*.js-meta.xml`, exports a default class, and ships a template. That filter
separates the 84 real components from internal primitives, service modules
(`navigation`, `messageDispatcher`) and CSS-only style modules (`sldsUtils*`).

The **Full catalog** page renders this data with a live filter over tag, module
name and public properties.

## Layout of the source

```
src/
  assets/css/site.css           shared page chrome styles
  layouts/main.njk              custom HTML layout (loads SLDS + site.css)
  modules/
    example/home/               "/" homepage stub
    example/vacancies/          "/vacancies" — first data-backed screen
    example/data/               "/data" — table browser route shell
    ui/dataBrowser/             schema-driven grid, search, paging, delete
    ui/dataForm/                create/edit form built from the column spec
    example/designSystem/       "/design-system" route shell
    ui/siteHeader/              global header shared by both routes
    ui/kitchenSink/             Storybook-style example browser
    ui/exampleStage/            lazy-mounts one example + its source
    data/catalog/               GENERATED component catalog
    data/exampleRegistry/       GENERATED lazy example loaders
    data/api/                   fetch client for the dev API
scripts/build-catalog.mjs       catalog + registry generator
scripts/dev-server.ts           LWR + /api on one port (npm run dev)
server/                         API: routes, repositories, SQL helpers
server/lib/admin-tables.ts      registry derived from SQLite introspection
data/msd-vd2.db                 SQLite database (committed, writable)
data/msd-vd2.seed.db            pristine copy for `npm run db:reset`
```

## Things worth knowing

**Version pinning.** `create-lwr` scaffolds `lwc` at a version behind the compiler
that `lwr` bundles, which makes every template log a version-mismatch error at
runtime. This project pins `lwc` to match (`9.4.3` against `lwr` `0.24.1`). If you
upgrade `lwr`, check `npm ls @lwc/compiler` and realign `lwc`.

**Overlays work standalone.** `LightningAlert.open()`, `LightningConfirm.open()`,
`LightningPrompt.open()` and `Toast.show()` create their own overlay container, so
they need no Lightning Experience host. `ShowToastEvent` on its own does *not*
work outside the platform — use `Toast.show(config, this)`.

**Why the build uses compat mode.** `npm run build` runs `--mode prod-compat`
(AMD) rather than the default ESM build. LWR's bundler throttles work through a
`TaskPool` whose size is hardcoded to 15 in `@lwrjs/shared-utils`, with no config
to raise it. Each dynamic `import()` reachable from a bundled module spawns a
nested bundle task that holds a pool slot while awaiting its own children, so
more than ~15 lazily imported modules deadlock the pool: the ESM build dies with
*"Unexpected early exit ... Promises returned by plugins cannot resolve"* and
emits a stub `index.html`. The AMD build handles the same 239 examples fine.
`npm run build:esm` is kept for reference and works only if the kitchen sink is
unreachable.

**Build warnings.** The SLDS 2 CSS references two Einstein SVGs that the published
package does not ship. The warnings are harmless unless you use the Einstein
header classes.

**Fonts.** Salesforce Sans is not redistributed in the npm package, so type falls
back to the system sans stack. Add the font files and a `@font-face` rule in the
layout if exact type matters.
