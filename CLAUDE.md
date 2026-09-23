# MSD VD2 — LWC prototype

Task routing for this repository. This file says **what this project is and which rules file
applies to which kind of task**. It deliberately carries no feature requirements and no product
copy — those belong in `_docs/` and in the screens themselves. Keep it that way.

## What this is

A **standalone design prototype of the MSD employer portal**, built to look and behave like a real
Salesforce Lightning Experience app. It runs as a plain LWR site: **no Salesforce org, no
`sfdx`/metadata deploy, no Apex, no LDS wire adapters.** Components are the open-source
`lightning-base-components`, styled by the SLDS 2 stylesheet loaded globally.

The goal is that a downstream Salesforce developer could lift a component into a real DX project
with minimal refactoring. That is why the layout and composition rules matter as much as the
visuals — see `rules-lwc-layout.md`.

Data is a local SQLite file served by an Express API that exists **under `npm run dev` only**.
`npm run build` produces a static site with no `/api`; every screen must degrade to an empty state
there rather than throwing.

## Stack

| Concern | Package | Notes |
|---|---|---|
| Framework | `lwc` `9.4.3` | Pinned to the compiler `lwr` bundles — see `rules-architecture.md` |
| Dev server / SSG | `lwr` `0.24.1` | `npm run dev`, `npm run build` |
| Components | `lightning-base-components` `1.28.19-alpha` | 84 `lightning-*` components |
| Styling | `@salesforce-ux/design-system-2` `2.264.2` | SLDS 2, Lightning Blue theme, **unscoped and global** |
| Data (dev only) | `better-sqlite3` | Express API over `data/msd-vd2.db` |
| Server language | TypeScript via `tsx` | No build step; `tsx` runs `.ts` directly |

Frontend in `src/`, backend in `server/`, both driven from one root `package.json`.
`npm run dev` starts the site and the API on one port.

## Rules

Read the rules file that covers the task **before** writing code. Where two conflict, the more
specific one wins.

@.claude/rules/rules-architecture.md
@.claude/rules/rules-lwc-components.md
@.claude/rules/rules-lwc-layout.md
@.claude/rules/rules-database.md
@.claude/rules/rules-app-logic.md

| File | Covers |
|---|---|
| [`rules-architecture.md`](.claude/rules/rules-architecture.md) | LWR config, module resolution, routing, light DOM, the static build, version pinning |
| [`rules-lwc-components.md`](.claude/rules/rules-lwc-components.md) | **Which components exist and how to verify it.** The gate for building anything custom |
| [`rules-lwc-layout.md`](.claude/rules/rules-lwc-layout.md) | Lightning page anatomy, spacing, styling hooks, the modular-component rule |
| [`rules-database.md`](.claude/rules/rules-database.md) | Schema → repository → route → client. Allow-lists, WAL, seed scripts |
| [`rules-app-logic.md`](.claude/rules/rules-app-logic.md) | Business rules: auth, account scoping, locked fields, primary contact |

## Workflows

### Build or change a page
1. `rules-lwc-components.md` — find the components that already exist. **Do not invent tags.**
2. `rules-lwc-layout.md` — pick the page anatomy and compose it modularly.
3. `rules-app-logic.md` if the screen touches auth, accounts, or permissions.
4. Verify in a browser before reporting it done — see *Verifying* below.

### Add a route
`lwr.config.json` → `routes[]` entry + a matching component under `src/modules/example/`.
`npm run catalog` never touches `routes`. Details in `rules-architecture.md`.

### Add or change data
`rules-database.md`. The order is always schema → repository → route → `data/api` client → screen.
Never let a screen reach the database directly.

### Add a component the library does not have
**Stop and ask first.** This is a hard gate — see `rules-lwc-components.md` § *The custom
component gate*.

### Gate something behind a release
`rules-app-logic.md` § *Release preview*. Register the flag, hold the release in a field, pass it
to `isEnabled`, and gate the whole widget.

### Browse what the component library can do
`npm run dev` → `/design-system` renders every shipped example live. The catalog behind it is
generated: `npm run catalog`.

### Reset or reseed data
`npm run db:reset` (restore from seed), `npm run auth:dev-passwords`, `npm run seed:team`.
All documented in `rules-database.md`.

## Before every implementation

1. **Check the component exists.** `rules-lwc-components.md` gives the two commands. A tag that is
   not in the catalog does not exist, however plausible it looks.
2. **Check the SLDS class exists** in the shipped stylesheet before using it. SLDS 2 dropped
   classes that SLDS 1 had (`slds-page-header_record-home` is the known trap).
3. **Read the existing screen that does the same thing.** `jobDetail` is the reference record page,
   `jobs` the reference list page, `manageOrg` the reference two-tab admin page.

## Verifying

A change is not done until it has run in a browser. The static build passing is not sufficient —
LWR renders client-side, so a template error only appears at runtime.

- `npm run dev` on a free port, then drive the page and read the console.
- `npm run build` must exit 0 before reporting completion.
- If a test wrote to `data/msd-vd2.db`, **restore it** and confirm with `git status`.

## Always

- Compose from existing `lightning-*` components first, SLDS blueprint markup second.
- Handle the no-API case on every data-backed screen (the static build has no `/api`).
- Use SLDS spacing utilities and styling hooks, never raw pixel values.
- Keep the server's allow-lists (`*_UPDATABLE`) as the only writable-field authority.
- Restore any seed data a test touched.

## Never

- Invent a `lightning-*` tag, attribute, or SLDS class without verifying it ships.
- Hand-author markup for something a shipped component already renders.
- Build a custom component without asking first.
- Let a screen call the database directly, or trust the client for a business rule.
- Commit a `data/*.db` change that is only a side effect of testing.
