# Architecture — LWR, modules, routes, and the static build

How the project is wired. Read this before changing `lwr.config.json`, adding a route, or touching
the dev server.

---

## Two halves, one package.json

| Half | Lives in | Runs |
|---|---|---|
| Site | `src/` | LWR — `npm run dev` (with API) or `npm run dev:lwr` (site only) |
| API | `server/` | Express, mounted into LWR's internal server by `scripts/dev-server.ts` |

`npm run dev` runs both on one port via `tsx scripts/dev-server.ts`. There is no compile step for
the server — `tsx` executes TypeScript directly.

## Module resolution

`lwr.config.json` → `lwc.modules` resolves every LWC import:

```json
"modules": [
  { "dir": "$rootDir/src/modules" },
  { "npm": "lightning-base-components" },
  { "name": "examples/…", "path": "node_modules/…" }
]
```

- `dir` — our own components, as `namespace/name`.
- `npm` — `lightning-base-components` ships its own `lwc.modules` declaring both its component
  directory and stubs for every `@salesforce/*` platform import (labels, i18n, feature flags). One
  entry pulls all of it in.
- `name`/`path` — the `examples/*` records for `/design-system`. **Generated.** `npm run catalog`
  rewrites this block; never hand-edit it.

`npm run catalog` never touches `routes`. Routes are hand-maintained.

## Routes

Adding a route is two steps:

1. An entry in `lwr.config.json` → `routes[]`:
   ```json
   { "id": "jobs", "path": "/jobs", "rootComponent": "example/jobs",
     "layoutTemplate": "$layoutsDir/main.njk" }
   ```
2. A matching component at `src/modules/example/jobs/`.

Every route uses `src/layouts/main.njk`, which loads the SLDS stylesheet and `site.css` and is the
only HTML shell.

**Query parameters are not part of the route.** LWR matches on path only, so `?id=2` is read at
runtime from `window.location.search`. Guard it for the static build:

```ts
if (typeof window === 'undefined') return null;
```

A component reading a query param must fall back sensibly when it is missing or unknown —
`example/jobDetail` falls back to the account's first vacancy.

## Assets

`lwr.config.json` → `assets[]` maps directories to URL paths:

| Alias | From | Served at |
|---|---|---|
| `assetsDir` | `src/assets` | `/public/assets` |
| `sldsCss` | `node_modules/@salesforce-ux/design-system-2/dist/css/bundled` | `/public/slds` |
| `favicon` | `src/assets/favicon.ico` | `/favicon.ico` |

The stylesheet is the **unscoped** `slds2.lightning-blue.css`, loaded globally in `main.njk`. There
is no cascade-layer juggling and no scope wrapper — which is precisely why every component must be
light DOM (see `rules-lwc-components.md`).

## Light DOM everywhere

Every component:

```ts
export default class Thing extends LightningElement {
    static renderMode: 'light' | 'shadow' = 'light';
}
```

```html
<template lwc:render-mode="light">
```

Both halves are required. Omit either and the component renders into a shadow root the global SLDS
stylesheet cannot reach.

## The static build

`npm run build` produces a fully static site in `site/` — **with no `/api`**.

This is the single most important constraint on data-backed screens. LWR answers `/api/*` in the
static build with the HTML shell, so `data/api` detects a non-JSON response and throws
`ApiError('Live data is not available in this build.')`. Every screen must catch it and render an
empty state:

```ts
} catch (e) {
    // The static build has no /api, so this is an expected state there.
    this.error = e instanceof ApiError ? e.message : 'Could not load …';
} finally {
    this.loading = false;
}
```

An unhandled rejection here is the only thing that breaks the static build.

LWR's SSG emits a shell and renders client-side, so `connectedCallback` runs in the browser only —
`window` access there is safe in practice, but guard it anyway for clarity.

`site/` is gitignored; building is always safe.

## Verifying a change

A green build proves the modules compile. It does **not** prove the page renders — LWR renders
client-side, so a template error surfaces only at runtime. Load the page in a browser and read the
console before calling anything done.

To check a module compiles without a browser:

```bash
curl -sL -o /dev/null -w '%{http_code}\n' \
  "http://localhost:3000/1/module/esm/0/l/en-US/mi/example%2Fjobs%2Fv%2F0_0_1/latest/example_jobs.js"
```

## Version pinning

`create-lwr` scaffolds `lwc` a version behind the compiler `lwr` bundles, which makes every
template log a version-mismatch error at runtime. `lwc` is pinned to `9.4.3` against `lwr` `0.24.1`.

**If you upgrade `lwr`:** check `npm ls @lwc/compiler` and realign `lwc` to match.

Overlay components (`LightningAlert.open()`, `LightningConfirm.open()`, `LightningPrompt.open()`,
`Toast.show()`) create their own overlay container and work standalone. `ShowToastEvent` alone does
not — it needs a Lightning Experience host to catch the event.

## npm cache

The npm cache on this machine is root-owned; `npm install` fails with `EACCES`. Use
`npm install --cache <writable-dir>` to get unblocked.
